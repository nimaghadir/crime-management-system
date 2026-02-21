from rest_framework.schemas.openapi import SchemaGenerator


def _as_openapi_examples(examples):
    return {
        name: {
            "summary": payload["summary"],
            "value": payload["value"],
        }
        for name, payload in examples.items()
    }


def _resolve_path(schema, path):
    paths = schema.get("paths", {})
    if path in paths:
        return path

    prefixed = f"/api{path}"
    if prefixed in paths:
        return prefixed
    return path


def _inject_request_examples(schema, path, method, examples):
    resolved_path = _resolve_path(schema, path)
    operation = schema.get("paths", {}).get(resolved_path, {}).get(method)
    if operation is None:
        return

    request_body = operation.get("requestBody")
    if not request_body:
        return

    content = request_body.get("content", {})
    json_content = content.get("application/json")
    if json_content is None:
        return

    json_content["examples"] = _as_openapi_examples(examples)


def _inject_response_examples(schema, path, method, status_code, examples):
    resolved_path = _resolve_path(schema, path)
    operation = schema.get("paths", {}).get(resolved_path, {}).get(method)
    if operation is None:
        return

    responses = operation.get("responses", {})
    response = responses.get(str(status_code))
    if not response:
        return

    content = response.get("content", {})
    json_content = content.get("application/json")
    if json_content is None:
        return

    json_content["examples"] = _as_openapi_examples(examples)


def inject_examples(schema):
    _inject_request_examples(
        schema,
        "/roles/",
        "post",
        {
            "createRole": {
                "summary": "Create a new role (system admin only)",
                "value": {
                    "name": "تحلیل گر",
                    "description": "Read-only analyst role for reports.",
                    "default_flags": {
                        "can_view_reports": True,
                        "can_manage_roles": False,
                    },
                },
            }
        },
    )
    _inject_request_examples(
        schema,
        "/roles/{id}/",
        "patch",
        {
            "updateRole": {
                "summary": "Update an existing role",
                "value": {
                    "description": "Updated role description",
                    "default_flags": {
                        "can_view_reports": True,
                        "can_manage_roles": False,
                    },
                },
            }
        },
    )
    _inject_request_examples(
        schema,
        "/users/{id}/assign-role/",
        "post",
        {
            "assignRole": {
                "summary": "Assign a role to a user (system admin only)",
                "value": {
                    "role": 5,
                },
            }
        },
    )
    _inject_request_examples(
        schema,
        "/complaints/",
        "post",
        {
            "createComplaint": {
                "summary": "Complainant submits a complaint draft",
                "value": {
                    "title": "Mobile phone theft",
                    "description": "The incident happened near metro station at 22:30.",
                },
            }
        },
    )
    _inject_request_examples(
        schema,
        "/complaints/{id}/intern/request-correction/",
        "post",
        {
            "internCorrection": {
                "summary": "Intern sends complaint back with a validation message",
                "value": {
                    "message": "Please provide the exact incident location and witness contact.",
                },
            }
        },
    )
    _inject_request_examples(
        schema,
        "/complaints/{id}/intern/forward-to-officer/",
        "post",
        {
            "forwardToOfficer": {
                "summary": "Intern forwards complaint to police officer",
                "value": {
                    "officer": 7,
                    "intern_note": "Initial checks passed.",
                },
            }
        },
    )
    _inject_request_examples(
        schema,
        "/complaints/{id}/officer/approve/",
        "post",
        {
            "officerApproveComplaint": {
                "summary": "Officer approves complaint and forms case",
                "value": {
                    "level": 2,
                    "assigned_to": 7,
                    "approval_note": "Approved and escalated to investigation team.",
                },
            }
        },
    )
    _inject_request_examples(
        schema,
        "/crime-scene-reports/",
        "post",
        {
            "createCrimeSceneReport": {
                "summary": "Police officer creates a crime scene report",
                "value": {
                    "title": "Street robbery report",
                    "description": "Patrol observed suspicious activity at midnight.",
                    "location": "District 7",
                    "observed_at": "2026-02-19T12:00:00Z",
                    "witnesses": [
                        {
                            "full_name": "Local Witness",
                            "national_id": "1234567890",
                            "phone": "09123334455",
                            "note": "Saw two suspects leaving on a bike.",
                        }
                    ],
                },
            }
        },
    )
    _inject_request_examples(
        schema,
        "/crime-scene-reports/{id}/approve/",
        "post",
        {
            "approveCrimeSceneReport": {
                "summary": "Superior officer approves crime scene report",
                "value": {
                    "note": "Approved after reviewing witness info and timeline.",
                },
            }
        },
    )
    _inject_request_examples(
        schema,
        "/case-complainants/",
        "post",
        {
            "addCaseComplainant": {
                "summary": "Add extra complainant to a case",
                "value": {
                    "case": 3,
                    "full_name": "Second Complainant",
                    "national_id": "2000000022",
                    "phone": "09120001122",
                },
            }
        },
    )
    _inject_request_examples(
        schema,
        "/case-complainants/{id}/intern-approve/",
        "post",
        {
            "approveCaseComplainant": {
                "summary": "Intern approves additional complainant record",
                "value": {
                    "note": "Identity documents verified.",
                },
            }
        },
    )
    _inject_request_examples(
        schema,
        "/auth/register/",
        "post",
        {
            "basicRegister": {
                "summary": "Create a new user",
                "value": {
                    "username": "detective01",
                    "password": "Pass123456!",
                    "email": "detective01@example.com",
                    "phone": "09120000001",
                    "first_name": "Ali",
                    "last_name": "Ahmadi",
                    "national_id": "100000001",
                },
            }
        },
    )
    _inject_request_examples(
        schema,
        "/auth/login/",
        "post",
        {
            "loginByUsername": {
                "summary": "Login with username and password",
                "value": {
                    "identifier": "detective01",
                    "password": "Pass123456!",
                },
            }
        },
    )
    _inject_response_examples(
        schema,
        "/auth/login/",
        "post",
        200,
        {
            "loginSuccess": {
                "summary": "Successful login response",
                "value": {
                    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    "user": {
                        "id": 1,
                        "username": "detective01",
                        "role_name": "Detective",
                    },
                },
            }
        },
    )
    _inject_request_examples(
        schema,
        "/cases/",
        "post",
        {
            "createCase": {
                "summary": "Create a new case",
                "value": {
                    "title": "Stolen vehicle in district 7",
                    "description": "Witness reported suspicious activity at 21:30.",
                    "level": 2,
                    "assigned_to": 2,
                    "tags": [1, 2],
                },
            }
        },
    )
    _inject_request_examples(
        schema,
        "/cases/{id}/",
        "patch",
        {
            "statusTransition": {
                "summary": "Update case status and level",
                "value": {
                    "status": "in_progress",
                    "level": 4,
                },
            }
        },
    )
    _inject_request_examples(
        schema,
        "/cases/complaints/{complaint_id}/convert/",
        "post",
        {
            "convertComplaint": {
                "summary": "Convert complaint to case",
                "value": {
                    "assigned_to": 2,
                    "level": 3,
                    "tags": [3],
                },
            }
        },
    )
    _inject_request_examples(
        schema,
        "/evidence/",
        "post",
        {
            "vehicleEvidence": {
                "summary": "Create vehicle evidence",
                "value": {
                    "case": 1,
                    "title": "Suspicious vehicle near alley",
                    "description": "Vehicle recorded by nearby camera.",
                    "type": "vehicle",
                    "metadata": {
                        "model": "Peugeot 206",
                        "color": "black",
                        "plate_number": "11A11111",
                    },
                },
            },
            "identityEvidence": {
                "summary": "Create identity-document evidence",
                "value": {
                    "case": 1,
                    "title": "Found ID card",
                    "description": "Identity card found near scene.",
                    "type": "identity",
                    "metadata": {
                        "owner_full_name": "Ali Ahmadi",
                        "attributes": {
                            "id_number": "1234567890",
                            "card_type": "national_id",
                        },
                    },
                },
            }
        },
    )
    _inject_request_examples(
        schema,
        "/evidence/{id}/verify/",
        "post",
        {
            "verifyEvidence": {
                "summary": "Mark evidence as verified",
                "value": {},
            }
        },
    )
    _inject_request_examples(
        schema,
        "/evidence-attachments/",
        "post",
        {
            "addAttachmentMetadata": {
                "summary": "Create attachment metadata record",
                "value": {
                    "evidence": 1,
                    "file_url": "https://storage.example.com/evidence/1/photo.jpg",
                    "mime_type": "image/jpeg",
                    "file_size": 123456,
                    "original_name": "scene-photo.jpg",
                },
            }
        },
    )
    _inject_request_examples(
        schema,
        "/evidence/{id}/biomedical-follow-up/",
        "patch",
        {
            "updateBioMedicalFollowUp": {
                "summary": "Update forensic and identity-bank follow-up results",
                "value": {
                    "forensic_result": "DNA profile confirmed.",
                    "identity_bank_result": "Matched with national ID database.",
                },
            }
        },
    )
    _inject_request_examples(
        schema,
        "/suspects/",
        "post",
        {
            "createSuspect": {
                "summary": "Add suspect to case",
                "value": {
                    "case": 1,
                    "name": "John Doe",
                    "national_id": "200000001",
                    "status": "suspect",
                },
            }
        },
    )
    _inject_request_examples(
        schema,
        "/notes/",
        "post",
        {
            "createNote": {
                "summary": "Create note for a case",
                "value": {
                    "case": 1,
                    "text": "Interview scheduled for tomorrow.",
                    "pinned": True,
                    "order_index": 0,
                },
            }
        },
    )
    _inject_request_examples(
        schema,
        "/notes/reorder/",
        "post",
        {
            "reorderNotes": {
                "summary": "Reorder all notes for a case",
                "value": {
                    "case": 1,
                    "note_ids": [5, 3, 4],
                },
            }
        },
    )
    _inject_request_examples(
        schema,
        "/investigation-actions/",
        "post",
        {
            "genericAction": {
                "summary": "Create a generic investigation action",
                "value": {
                    "case": 1,
                    "action_type": "evidence_linked",
                    "payload": {
                        "suspect_id": 3,
                        "evidence_id": 10,
                    },
                },
            }
        },
    )
    _inject_request_examples(
        schema,
        "/investigation-actions/start-interrogation/",
        "post",
        {
            "startInterrogation": {
                "summary": "Start interrogation for a suspect",
                "value": {
                    "case": 1,
                    "suspect_id": 3,
                    "note": "Session started at station room 2.",
                },
            }
        },
    )


class CaseflowSchemaGenerator(SchemaGenerator):
    def get_schema(self, request=None, public=False):
        schema = super().get_schema(request=request, public=public)
        if schema:
            inject_examples(schema)
        return schema
