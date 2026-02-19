from rest_framework.schemas.openapi import SchemaGenerator


def _as_openapi_examples(examples):
    return {
        name: {
            "summary": payload["summary"],
            "value": payload["value"],
        }
        for name, payload in examples.items()
    }


def _inject_request_examples(schema, path, method, examples):
    operation = schema.get("paths", {}).get(path, {}).get(method)
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
    operation = schema.get("paths", {}).get(path, {}).get(method)
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
            "addEvidence": {
                "summary": "Create evidence metadata",
                "value": {
                    "case": 1,
                    "type": "vehicle",
                    "metadata": {
                        "plate_number": "11A11111",
                        "camera_source": "cam-12",
                    },
                    "tags": [1],
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
