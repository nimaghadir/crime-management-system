# crime-management-system

Crime management system for a Web Programming course (Django + DRF backend, React frontend).

## Requirements
- Python 3.12
- Docker (for Postgres) or a local Postgres instance

## Backend setup (local)
From the project root:

Start Postgres (recommended):
```bash
docker compose up -d
```

Create venv:
```bash
cd backend
python -m venv venv
source venv/bin/activate
```

Install dependencies:
```bash
python -m pip install -r requirements.txt
```

Run migrations:
```bash
python manage.py makemigrations
python manage.py migrate
```

`migrate` seeds the base user roles automatically (including `مدیر کل سامانه` and `کاربر پایه`).
Seeded roles:
`مدیر کل سامانه`, `رئیس پلیس`, `کاپیتان`, `گروهبان`, `کارآگاه`, `مامور پلیس`,
`افسر گشت`, `کارآموز`, `شاکی`, `شاهد`, `متهم`, `مجرم`, `قاضی`, `پزشک قانونی`, `کاربر پایه`.

Run the dev server:
```bash
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

`POST /api/auth/register/` requires:
- `username`
- `password`
- `email`
- `phone`
- `first_name`
- `last_name`
- `national_id`

## Environment
Backend reads DB settings from `backend/.env`. Default values:

```
DB_NAME=caseflow
DB_USER=caseflow
DB_PASSWORD=caseflow
DB_HOST=127.0.0.1
DB_PORT=5432
```

If you use a local Postgres install (no Docker), update these values accordingly.
