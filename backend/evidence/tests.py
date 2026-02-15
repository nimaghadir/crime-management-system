from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase

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
