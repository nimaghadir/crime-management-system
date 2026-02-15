from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.urls import reverse
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from cases.models import Case, Tag
from investigations.models import InvestigationAction
from .models import Evidence, EvidenceAttachment


class EvidenceModelTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="investigator", password="pass")
        self.case = Case.objects.create(title="Case E", created_by=self.user)

    def test_evidence_defaults_and_tags(self):
        evidence = Evidence.objects.create(
            case=self.case,
            type=Evidence.EvidenceType.OTHER,
            uploaded_by=self.user,
        )
        tag = Tag.objects.create(name="photo")
        evidence.tags.add(tag)

        self.assertEqual(evidence.status, Evidence.Status.PENDING)
        self.assertEqual(evidence.metadata, {})
        self.assertEqual(evidence.tags.count(), 1)

    def test_evidence_attachment_requires_url_or_path(self):
        evidence = Evidence.objects.create(case=self.case, type=Evidence.EvidenceType.TESTIMONY)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                EvidenceAttachment.objects.create(evidence=evidence)

    def test_evidence_attachment_accepts_file_url(self):
        evidence = Evidence.objects.create(case=self.case, type=Evidence.EvidenceType.IDENTITY)
        attachment = EvidenceAttachment.objects.create(
            evidence=evidence,
            file_url="https://example.com/file.jpg",
        )
        self.assertEqual(attachment.file_url, "https://example.com/file.jpg")


class EvidenceApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(username="evi-user", password="pass12345")
        self.other_user = user_model.objects.create_user(
            username="evi-other",
            password="pass12345",
        )
        self.case = Case.objects.create(title="Case E API", created_by=self.user)
        self.other_case = Case.objects.create(title="Case E API 2", created_by=self.other_user)
        self.client.force_authenticate(user=self.user)

    def test_evidence_create_sets_uploaded_by_and_default_status(self):
        payload = {
            "case": self.case.id,
            "type": Evidence.EvidenceType.OTHER,
            "metadata": {"source": "citizen"},
            "status": Evidence.Status.VERIFIED,
        }
        response = self.client.post(reverse("evidence-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = Evidence.objects.get(pk=response.data["id"])
        self.assertEqual(created.uploaded_by_id, self.user.id)
        self.assertEqual(created.status, Evidence.Status.PENDING)
        self.assertEqual(created.metadata, {"source": "citizen"})

    def test_evidence_list_endpoint_and_case_filter(self):
        evidence_a = Evidence.objects.create(
            case=self.case,
            type=Evidence.EvidenceType.TESTIMONY,
            uploaded_by=self.user,
        )
        Evidence.objects.create(
            case=self.other_case,
            type=Evidence.EvidenceType.VEHICLE,
            uploaded_by=self.other_user,
        )

        response = self.client.get(reverse("evidence-list"), {"case": self.case.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], evidence_a.id)

    def test_evidence_verify_updates_status_and_creates_coc_action(self):
        evidence = Evidence.objects.create(
            case=self.case,
            type=Evidence.EvidenceType.BIO_MEDICAL,
            status=Evidence.Status.PENDING,
            uploaded_by=self.user,
        )

        response = self.client.post(reverse("evidence-verify", args=[evidence.id]), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        evidence.refresh_from_db()
        self.assertEqual(evidence.status, Evidence.Status.VERIFIED)

        action = InvestigationAction.objects.get(case=self.case, action_type="evidence_verified")
        self.assertEqual(action.payload["evidence_id"], evidence.id)
        self.assertEqual(action.payload["from_status"], Evidence.Status.PENDING)
        self.assertEqual(action.payload["to_status"], Evidence.Status.VERIFIED)
        self.assertEqual(action.performed_by_id, self.user.id)

    def test_evidence_verify_rejects_when_already_verified(self):
        evidence = Evidence.objects.create(
            case=self.case,
            type=Evidence.EvidenceType.IDENTITY,
            status=Evidence.Status.VERIFIED,
            uploaded_by=self.user,
        )

        response = self.client.post(reverse("evidence-verify", args=[evidence.id]), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "validation_error")
        self.assertEqual(
            InvestigationAction.objects.filter(case=self.case, action_type="evidence_verified").count(),
            0,
        )

    def test_evidence_attachment_create_endpoint_sets_uploaded_by(self):
        evidence = Evidence.objects.create(
            case=self.case,
            type=Evidence.EvidenceType.VEHICLE,
            uploaded_by=self.user,
        )
        payload = {
            "evidence": evidence.id,
            "file_url": "https://example.com/evidence.png",
            "mime_type": "image/png",
            "original_name": "evidence.png",
        }

        response = self.client.post(reverse("evidence-attachments-list"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        attachment = EvidenceAttachment.objects.get(pk=response.data["id"])
        self.assertEqual(attachment.uploaded_by_id, self.user.id)
        self.assertEqual(attachment.evidence_id, evidence.id)

    def test_evidence_attachment_create_requires_url_or_path(self):
        evidence = Evidence.objects.create(
            case=self.case,
            type=Evidence.EvidenceType.OTHER,
            uploaded_by=self.user,
        )
        payload = {"evidence": evidence.id, "mime_type": "application/json"}
        response = self.client.post(reverse("evidence-attachments-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "validation_error")
