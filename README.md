# crime-management-system

Crime management system for a Web Programming course (Django + DRF backend, React frontend).

## Requirements
- Docker + Docker Compose

## Quick start (Dockerized backend + frontend)
Run these from project root:

```bash
docker compose up --build
```

Services:
- Frontend (React): `http://127.0.0.1:5173`
- Backend API (Django): `http://127.0.0.1:8000/api/`
- API docs UI: `http://127.0.0.1:8000/api/docs/`

Stop services:
```bash
docker compose down
```

Stop and remove Postgres data too:
```bash
docker compose down -v
```

## Local backend only (without Docker for frontend)
From project root:

```bash
docker compose up -d db
cd backend
python -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## API docs UI (Swagger-style)
After the server is running, open:

- `http://127.0.0.1:8000/api/docs/` (interactive UI)
- `http://127.0.0.1:8000/api/schema/` (OpenAPI schema JSON)

For protected endpoints:
1. Call `POST /api/auth/login/` or `POST /api/auth/register/`.
2. Copy `access_token`.
3. Paste it into the token box at the top of the docs UI and click `Save`.

Role management endpoints are available at `GET/POST/PATCH/DELETE /api/roles/...` and are restricted to system-admin users.
System admins can also assign roles with `POST /api/users/{id}/assign-role/`.
User listing endpoints (`GET /api/users/` and `GET /api/users/{id}/`) are also system-admin only.

Note: current frontend calls `/api/v1/...` and backend supports both `/api/...` and `/api/v1/...`.

Case formation workflow endpoints:
- Complaint path:
  - `POST /api/complaints/`
  - `PATCH /api/complaints/{id}/` (complainant resubmission after correction)
  - `POST /api/complaints/{id}/intern/request-correction/`
  - `POST /api/complaints/{id}/intern/forward-to-officer/`
  - `POST /api/complaints/{id}/officer/return-to-intern/`
  - `POST /api/complaints/{id}/officer/approve/`
- Crime scene path:
  - `POST /api/crime-scene-reports/`
  - `POST /api/crime-scene-reports/{id}/approve/`
- Additional complainants on formed cases:
  - `POST /api/case-complainants/`
  - `POST /api/case-complainants/{id}/intern-approve/`
  - `POST /api/case-complainants/{id}/intern-reject/`

Evidence endpoints:
- `POST /api/evidence/` and `GET /api/evidence/?case={id}`
- `GET /api/evidence/{id}/`
- `POST /api/evidence/{id}/verify/`
- `PATCH /api/evidence/{id}/biomedical-follow-up/` (only bio-medical evidence)
- `POST /api/evidence-attachments/`

Evidence rules implemented:
- All evidence records require `title`, `description`, `recorded_at`, and recorder (`uploaded_by`).
- Vehicle evidence requires `model` + `color` and exactly one of `plate_number` or `serial_number`.
- Identity-document evidence requires `metadata.owner_full_name`.
- Bio-medical evidence can be verified only after at least one image attachment is recorded.
- Bio-medical follow-up (`forensic_result`, `identity_bank_result`) is recorded later via dedicated endpoint.

`POST /api/auth/register/` requires:
- `username`
- `password`
- `email`
- `phone`
- `first_name`
- `last_name`
- `national_id`

## Environment
Backend reads DB settings from `backend/.env`. Docker Compose overrides DB host to `db` automatically.
Default local values:

```
DB_NAME=caseflow
DB_USER=caseflow
DB_PASSWORD=caseflow
DB_HOST=127.0.0.1
DB_PORT=5432
CORS_ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
```

If you use a local Postgres install (no Docker), update these values accordingly.

## Frontend mock/real switch
Frontend API calls can run in two modes using env vars in `frontend/.env` (copy from `frontend/.env.example`):

- `VITE_USE_MOCK_API=true`
  - All supported API calls use local mock storage in `frontend/src/lib/mockData.js`.
  - Useful when backend is not ready or partially available.
- `VITE_USE_MOCK_API=false`
  - Frontend calls real backend via `VITE_API_BASE_URL`.
- `VITE_USE_MOCK_FALLBACK=true`
  - If a real API call fails, frontend falls back to mock for supported endpoints.
- `VITE_USE_MOCK_FALLBACK=false`
  - Strict mode for final integration with backend.

Recommended final integration settings:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
VITE_USE_MOCK_API=false
VITE_USE_MOCK_FALLBACK=false
```

### Mock testing workflow
- Use `VITE_USE_MOCK_API=true` (or `VITE_USE_MOCK_FALLBACK=true`).
- Login as seeded system admin:
  - identifier: `sysadmin`
  - password: `admin123`
- After login, admin users are redirected to the custom admin page at `/admin/console`.
- In `/admin/console` you can:
  - inspect model-like counts and recent records
  - see seeded test accounts by role
  - reset browser mock storage with **Reset Mock Store** and retest flows
  - manage roles via **Role Management**

## Troubleshooting
- Frontend shows `Failed to fetch` on login/register:
  - Usually this is CORS or backend not running.
  - Check backend is reachable: `http://127.0.0.1:8000/api/health/`
  - Ensure `CORS_ALLOWED_ORIGINS` includes your frontend origin (`5173`).
  - If using Docker, restart backend after env changes:
    - `docker compose restart backend`
