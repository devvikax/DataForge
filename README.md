# DataForge

Personal form creation, data collection, and spreadsheet automation platform.

## Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, ShadCN UI
- **Backend**: Python FastAPI, SQLAlchemy 2.0 (async), Alembic
- **Database**: PostgreSQL 17
- **File Storage**: Cloudinary
- **Deployment**: Docker Compose

## Quick Start

1. Copy env files:
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   ```

2. Edit `.env` with your values (especially `SECRET_KEY` — use a random 64-char hex string)

3. Start all services:
   ```bash
   docker-compose up --build
   ```

4. Access:
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:8000
   - **API Docs**: http://localhost:8000/docs

## Development

### Backend only (without Docker)
```bash
cd backend
python -m venv .venv
.venv/Scripts/activate   # Windows
pip install -r requirements.txt
cp .env.example .env     # edit DATABASE_URL to point at your local postgres
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend only (without Docker)
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## Project Structure

```
DataForge/
├── backend/          # Python FastAPI application
│   ├── app/
│   │   ├── core/     # Config, security, dependencies
│   │   ├── db/       # SQLAlchemy engine + session
│   │   ├── models/   # ORM models (8 tables)
│   │   ├── schemas/  # Pydantic request/response schemas
│   │   ├── routers/  # FastAPI route handlers
│   │   └── services/ # Business logic layer
│   ├── alembic/      # Database migrations
│   └── Dockerfile
├── frontend/         # Next.js 14 App Router application
│   ├── app/          # Pages and layouts
│   ├── components/   # Reusable UI components
│   ├── contexts/     # React context providers
│   ├── lib/          # API client, utilities
│   └── Dockerfile
├── docker/
│   └── postgres/     # PostgreSQL init scripts
├── .env.example      # Root environment template
└── docker-compose.yml
```

## Default Admin Credentials

Set via environment variables in `.env`:
- `ADMIN_USERNAME` (default: `admin`)
- `ADMIN_PASSWORD` (default: `adminpassword123` — **change this**)
