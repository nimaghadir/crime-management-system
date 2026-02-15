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

Run the dev server:
```bash
python manage.py runserver
```

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
