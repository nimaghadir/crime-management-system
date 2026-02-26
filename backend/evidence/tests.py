
import uuid

from django.contrib.auth.models import Group
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.constants import BASIC_USER, CORONER, DETECTIVE, WITNESS
from accounts.models import User
from cases.models import Case, CaseWitness
from evidence.models import BiologicalEvidence, EvidenceAttachment, TestimonyEvidence


def _unique_id():
    return str(uuid.uuid4().int)


def create_user(username, role, password="testpass123"):
    uid = _unique_id()
    user = User.objects.create_user(
        username=username,
        password=password,
        national_id=uid[:10],
        phone_number=f"09{uid[:9]}",
        email=f"{username}-{uid[:6]}@example.com",
    )
    group, _ = Group.objects.get_or_create(name=role)
    user.groups.add(group)
    return user


def create_case(title, status_value=Case.Status.OPEN, detective=None, coroner=None):
    return Case.objects.create(
        title=title,
        description=f"{title} description",
        crime_level=Case.CrimeLevel.LEVEL_1,
        status=status_value,
        creation_method=Case.CreationMethod.COMPLAINT,
        assigned_detective=detective,
        assigned_coroner=coroner,
    )


class EvidenceApiTests(APITestCase):
    def setUp(self):
        self.detective = create_user("ev_det", DETECTIVE)
        self.witness = create_user("ev_witness", WITNESS)
        self.basic_user = create_user("ev_basic", BASIC_USER)
        self.coroner = create_user("ev_coroner", CORONER)
        self.other_coroner = create_user("ev_other_coroner", CORONER)

        self.case_open = create_case("Open Evidence Case", detective=self.detective, coroner=self.coroner)
        self.case_locked = create_case("Locked Evidence Case", status_value=Case.Status.AWAITING_TRIAL, detective=self.detective)

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def test_detective_can_create_testimony_evidence(self):
        self._auth(self.detective)
        response = self.client.post(
            "/api/evidence/testimony/",
            {
                "case": self.case_open.id,
                "witness": self.witness.id,
                "title": "Witness statement",
                "description": "Saw suspect near the scene",
                "transcript": "Short transcript",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TestimonyEvidence.objects.count(), 1)
        row = TestimonyEvidence.objects.first()
        self.assertEqual(row.submitter_id, self.detective.id)
        self.assertEqual(row.case_id, self.case_open.id)

    def test_witness_can_create_testimony_and_is_linked_to_case_witness(self):
        self._auth(self.witness)
        response = self.client.post(
            "/api/evidence/testimony/",
            {
                "case": self.case_open.id,
                "witness": self.witness.id,
                "title": "My witness testimony",
                "description": "I saw the incident.",
                "transcript": "Transcript body",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        testimony = TestimonyEvidence.objects.get(pk=response.data["id"])
        self.assertEqual(testimony.submitter_id, self.witness.id)
        self.assertEqual(testimony.witness_id, self.witness.id)
        self.assertTrue(CaseWitness.objects.filter(case=self.case_open, user=self.witness).exists())

    def test_basic_user_cannot_create_testimony(self):
        self._auth(self.basic_user)
        response = self.client.post(
            "/api/evidence/testimony/",
            {
                "case": self.case_open.id,
                "witness": self.witness.id,
                "title": "Should fail",
                "description": "No access",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_add_vehicle_evidence_after_case_reaches_trial_stage(self):
        self._auth(self.detective)
        response = self.client.post(
            "/api/evidence/vehicle/",
            {
                "case": self.case_locked.id,
                "title": "Vehicle clue",
                "description": "Car seen near area",
                "model_name": "Peugeot",
                "color": "White",
                "license_plate": "12A34567",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_assigned_coroner_can_review_biological_evidence(self):
        bio = BiologicalEvidence.objects.create(
            case=self.case_open,
            submitter=self.detective,
            title="Blood sample",
            description="Found on floor",
        )

        self._auth(self.coroner)
        response = self.client.patch(
            f"/api/evidence/biological/{bio.id}/",
            {
                "review_status": "confirmed",
                "doctor_notes": "Matched expected profile",
                "identity_db_notes": "DB hit confirmed",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        bio.refresh_from_db()
        self.assertEqual(bio.review_status, BiologicalEvidence.ReviewStatus.CONFIRMED)
        self.assertEqual(bio.reviewed_by_id, self.coroner.id)

    def test_other_coroner_cannot_review_assigned_biological_evidence(self):
        bio = BiologicalEvidence.objects.create(
            case=self.case_open,
            submitter=self.detective,
            title="Hair sample",
            description="Found in vehicle",
        )
        self._auth(self.other_coroner)
        response = self.client.patch(
            f"/api/evidence/biological/{bio.id}/",
            {"review_status": "rejected", "doctor_notes": "Not enough sample"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_detective_can_attach_file_to_testimony_and_list_attachments(self):
        testimony = TestimonyEvidence.objects.create(
            case=self.case_open,
            submitter=self.detective,
            witness=self.witness,
            title="Street camera witness",
            description="Video statement",
        )
        self._auth(self.detective)
        upload = SimpleUploadedFile("note.txt", b"hello evidence", content_type="text/plain")
        create_response = self.client.post(
            "/api/evidence/attachments/",
            {
                "evidence_type": EvidenceAttachment.EvidenceType.TESTIMONY,
                "evidence_id": testimony.id,
                "file": upload,
                "mime_type": "text/plain",
                "original_name": "note.txt",
            },
            format="multipart",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        list_response = self.client.get(
            "/api/evidence/attachments/",
            {"evidence_type": EvidenceAttachment.EvidenceType.TESTIMONY, "evidence_id": testimony.id},
        )
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["original_name"], "note.txt")

    def test_attachment_create_is_blocked_for_locked_case(self):
        testimony = TestimonyEvidence.objects.create(
            case=self.case_locked,
            submitter=self.detective,
            witness=self.witness,
            title="Locked case testimony",
            description="Existing evidence",
        )
        self._auth(self.detective)
        upload = SimpleUploadedFile("locked.txt", b"locked", content_type="text/plain")
        response = self.client.post(
            "/api/evidence/attachments/",
            {
                "evidence_type": EvidenceAttachment.EvidenceType.TESTIMONY,
                "evidence_id": testimony.id,
                "file": upload,
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
