from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.urls import reverse
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from cases.models import Case, Tag
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
