from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.urls import reverse
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from cases.models import Case
from .models import InvestigationAction, Note, Suspect


class InvestigationsModelTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="officer", password="pass")
        self.case = Case.objects.create(title="Case I", created_by=self.user)

    def test_suspect_score_constraint(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Suspect.objects.create(case=self.case, name="Bad Score", score=11)

    def test_note_defaults(self):
        note = Note.objects.create(case=self.case, author=self.user, text="Follow the lead")
        self.assertFalse(note.pinned)
        self.assertEqual(note.order_index, 0)

    def test_investigation_action_default_payload(self):
        action = InvestigationAction.objects.create(
            case=self.case,
            action_type="link_evidence",
            performed_by=self.user,
        )
        self.assertEqual(action.payload, {})

    def test_investigation_action_scoring_hook_updates_suspect_score(self):
        suspect = Suspect.objects.create(case=self.case, name="Scored Suspect", score=4)

        InvestigationAction.objects.create(
            case=self.case,
            action_type="start_interrogation",
            payload={"suspect_id": suspect.id},
            performed_by=self.user,
        )

        suspect.refresh_from_db()
        self.assertEqual(suspect.score, 6)


class SuspectApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(username="inv-api", password="pass12345")
        self.other_user = user_model.objects.create_user(
            username="inv-api-2",
            password="pass12345",
        )
        self.case = Case.objects.create(title="Investigations API Case", created_by=self.user)
        self.other_case = Case.objects.create(title="Other Case", created_by=self.other_user)
        self.client.force_authenticate(user=self.user)

    def test_suspect_create_endpoint(self):
        payload = {
            "case": self.case.id,
            "name": "John Smith",
            "national_id": "N-222",
            "status": Suspect.Status.SUSPECT,
            "score": 10,
        }
        response = self.client.post(reverse("suspects-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = Suspect.objects.get(pk=response.data["id"])
        self.assertEqual(created.case_id, self.case.id)
        self.assertEqual(created.name, "John Smith")
        self.assertEqual(created.status, Suspect.Status.SUSPECT)
        self.assertEqual(created.score, 0)

    def test_suspect_list_endpoint_supports_case_filter(self):
        suspect_a = Suspect.objects.create(case=self.case, name="A", status=Suspect.Status.SUSPECT)
        Suspect.objects.create(case=self.other_case, name="B", status=Suspect.Status.SUSPECT)

        response = self.client.get(reverse("suspects-list"), {"case": self.case.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], suspect_a.id)

    def test_suspect_partial_update_endpoint(self):
        suspect = Suspect.objects.create(
            case=self.case,
            name="Old Name",
            national_id="N-333",
            status=Suspect.Status.SUSPECT,
        )
        payload = {
            "name": "Updated Name",
            "status": Suspect.Status.ARRESTED,
        }
        response = self.client.patch(reverse("suspects-detail", args=[suspect.id]), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        suspect.refresh_from_db()
        self.assertEqual(suspect.name, "Updated Name")
        self.assertEqual(suspect.status, Suspect.Status.ARRESTED)


class NoteApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(username="note-api", password="pass12345")
        self.other_user = user_model.objects.create_user(
            username="note-api-2",
            password="pass12345",
        )
        self.case = Case.objects.create(title="Notes API Case", created_by=self.user)
        self.other_case = Case.objects.create(title="Other Notes Case", created_by=self.other_user)
        self.client.force_authenticate(user=self.user)

    def test_note_create_sets_author(self):
        payload = {
            "case": self.case.id,
            "text": "First note",
            "pinned": True,
            "order_index": 3,
        }
        response = self.client.post(reverse("notes-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = Note.objects.get(pk=response.data["id"])
        self.assertEqual(created.author_id, self.user.id)
        self.assertEqual(created.case_id, self.case.id)
        self.assertEqual(created.text, "First note")
        self.assertTrue(created.pinned)
        self.assertEqual(created.order_index, 3)

    def test_note_partial_update_updates_text_and_pin(self):
        note = Note.objects.create(
            case=self.case,
            author=self.user,
            text="Old text",
            pinned=False,
            order_index=1,
        )
        payload = {"text": "Updated text", "pinned": True}
        response = self.client.patch(reverse("notes-detail", args=[note.id]), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        note.refresh_from_db()
        self.assertEqual(note.text, "Updated text")
        self.assertTrue(note.pinned)

    def test_note_partial_update_rejects_case_change(self):
        note = Note.objects.create(case=self.case, author=self.user, text="Keep case")
        payload = {"case": self.other_case.id}
        response = self.client.patch(reverse("notes-detail", args=[note.id]), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "validation_error")
        note.refresh_from_db()
        self.assertEqual(note.case_id, self.case.id)

    def test_note_delete_endpoint(self):
        note = Note.objects.create(case=self.case, author=self.user, text="Delete me")
        response = self.client.delete(reverse("notes-detail", args=[note.id]))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Note.objects.filter(pk=note.id).count(), 0)

    def test_notes_reorder_endpoint_updates_order_atomically(self):
        note1 = Note.objects.create(case=self.case, author=self.user, text="N1", order_index=0)
        note2 = Note.objects.create(case=self.case, author=self.user, text="N2", order_index=1)
        note3 = Note.objects.create(case=self.case, author=self.user, text="N3", order_index=2)

        payload = {"case": self.case.id, "note_ids": [note3.id, note1.id, note2.id]}
        response = self.client.post(reverse("notes-reorder"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        note1.refresh_from_db()
        note2.refresh_from_db()
        note3.refresh_from_db()
        self.assertEqual(note3.order_index, 0)
        self.assertEqual(note1.order_index, 1)
        self.assertEqual(note2.order_index, 2)

    def test_notes_reorder_rejects_ids_outside_case(self):
        note1 = Note.objects.create(case=self.case, author=self.user, text="N1")
        note2 = Note.objects.create(case=self.case, author=self.user, text="N2")
        foreign_note = Note.objects.create(case=self.other_case, author=self.other_user, text="foreign")

        payload = {"case": self.case.id, "note_ids": [note1.id, note2.id, foreign_note.id]}
        response = self.client.post(reverse("notes-reorder"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "validation_error")


class InvestigationActionApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(username="action-api", password="pass12345")
        self.other_user = user_model.objects.create_user(
            username="action-api-2",
            password="pass12345",
        )
        self.case = Case.objects.create(title="Actions Case", created_by=self.user)
        self.other_case = Case.objects.create(title="Other Actions Case", created_by=self.other_user)
        self.client.force_authenticate(user=self.user)

    def test_investigation_action_create_sets_performed_by(self):
        payload = {
            "case": self.case.id,
            "action_type": "start_interrogation",
            "payload": {"suspect_id": 1},
            "performed_by": self.other_user.id,
        }
        response = self.client.post(reverse("investigation-actions-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = InvestigationAction.objects.get(pk=response.data["id"])
        self.assertEqual(created.case_id, self.case.id)
        self.assertEqual(created.action_type, "start_interrogation")
        self.assertEqual(created.payload, {"suspect_id": 1})
        self.assertEqual(created.performed_by_id, self.user.id)

    def test_investigation_action_list_supports_case_filter(self):
        action_a = InvestigationAction.objects.create(
            case=self.case,
            action_type="a1",
            performed_by=self.user,
        )
        InvestigationAction.objects.create(
            case=self.other_case,
            action_type="a2",
            performed_by=self.other_user,
        )

        response = self.client.get(reverse("investigation-actions-list"), {"case": self.case.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], action_a.id)

    def test_start_interrogation_endpoint_creates_action_and_updates_score(self):
        suspect = Suspect.objects.create(case=self.case, name="Target", score=3)
        payload = {
            "case": self.case.id,
            "suspect_id": suspect.id,
            "note": "Initial session",
        }

        response = self.client.post(
            reverse("investigation-actions-start-interrogation"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = InvestigationAction.objects.get(pk=response.data["id"])
        self.assertEqual(created.action_type, "start_interrogation")
        self.assertEqual(created.performed_by_id, self.user.id)
        self.assertEqual(created.payload["suspect_id"], suspect.id)
        self.assertEqual(created.payload["note"], "Initial session")

        suspect.refresh_from_db()
        self.assertEqual(suspect.score, 5)

    def test_start_interrogation_rejects_suspect_from_another_case(self):
        foreign_suspect = Suspect.objects.create(case=self.other_case, name="Foreign")
        payload = {"case": self.case.id, "suspect_id": foreign_suspect.id}

        response = self.client.post(
            reverse("investigation-actions-start-interrogation"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "validation_error")

    def test_action_scoring_hook_clamps_suspect_score(self):
        suspect = Suspect.objects.create(case=self.case, name="Clamp", score=1)
        payload = {
            "case": self.case.id,
            "action_type": "alibi_verified",
            "payload": {"suspect_id": suspect.id},
        }

        response = self.client.post(reverse("investigation-actions-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        suspect.refresh_from_db()
        self.assertEqual(suspect.score, 0)
