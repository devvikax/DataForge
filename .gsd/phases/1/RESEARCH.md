# RESEARCH.md — Phase 1: Project Foundation & Infrastructure

> Research Date: 2026-06-07
> Discovery Level: 2 (Standard Research)

---

## Summary

Phase 1 uses well-established technologies. Research confirmed exact commands, version choices, and patterns to use in PLAN.md files.

---

## 1. Next.js + ShadCN UI Setup

**Confirmed commands (2024/2025):**
```bash
# Create Next.js app (use --typescript --tailwind --app --no-git flags)
npx create-next-app@latest frontend --typescript --tailwind --app --no-git --no-eslint

# Initialize ShadCN (CLI changed from shadcn-ui to shadcn)
cd frontend && npx shadcn@latest init
# Use -d flag for defaults: npx shadcn@latest init -d

# Add components individually
npx shadcn@latest add button card input label form table badge sidebar
```

**Key config choices for DataForge:**
- Style: New York (sharper borders, fits Neo-Brutalism)
- Base color: Zinc (neutral, high contrast compatible)
- CSS variables: Yes
- RSC: Yes (App Router)

---

## 2. FastAPI Project Structure

**Adopted structure (domain-driven):**
```
backend/
├── app/
│   ├── main.py           # FastAPI app entry point
│   ├── core/
│   │   ├── config.py     # Settings (pydantic-settings)
│   │   └── security.py   # JWT + bcrypt utilities
│   ├── db/
│   │   ├── base.py       # SQLAlchemy Base
│   │   └── session.py    # Async engine + session factory
│   ├── models/           # SQLAlchemy ORM models
│   ├── schemas/          # Pydantic request/response schemas
│   ├── routers/          # FastAPI routers (one per domain)
│   └── services/         # Business logic layer
├── alembic/              # Alembic migrations
├── alembic.ini
├── requirements.txt
└── Dockerfile
```

**Key dependencies:**
```
fastapi==0.115.x
uvicorn[standard]==0.30.x
sqlalchemy[asyncio]==2.0.x
asyncpg==0.29.x
alembic==1.13.x
pydantic-settings==2.x
python-jose[cryptography]==3.3.x
passlib[bcrypt]==1.7.x
python-multipart==0.0.x
cloudinary==1.36.x
openpyxl==3.1.x
```

---

## 3. Async SQLAlchemy + Alembic

**Async engine pattern:**
```python
# db/session.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

**DATABASE_URL format for async:**
```
postgresql+asyncpg://user:password@host:5432/dbname
```

**Alembic async setup requires** `env.py` to use `run_sync` on the synchronous connection. Use the standard async pattern from Alembic docs.

---

## 4. Docker Compose Pattern

**Confirmed best pattern for 2024:**
```yaml
services:
  postgres:
    image: postgres:17-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s

  backend:
    depends_on:
      postgres:
        condition: service_healthy
    # Run migrations + start server in entrypoint

  frontend:
    depends_on:
      backend:
        condition: service_started
```

**Key decisions:**
- PostgreSQL 17-alpine (latest stable, small image)
- Backend entrypoint runs `alembic upgrade head` then `uvicorn`
- Frontend uses `npm run dev` in development mode
- Hot reload: mount source volumes in dev mode

---

## 5. JWT Authentication

**Library stack:**
- `python-jose[cryptography]` — JWT encode/decode
- `passlib[bcrypt]` — Password hashing
- `OAuth2PasswordBearer` — FastAPI built-in token extraction

**Admin seed strategy:**
- `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env`
- On startup, check if admin user exists; if not, create it
- No registration endpoint exposed

**Token flow:**
- `POST /api/auth/login` → returns `{access_token, token_type}`
- All `/api/admin/*` routes require `Authorization: Bearer {token}`
- Frontend stores token in `httpOnly` cookie or `localStorage` (localStorage for simplicity in v1)

---

## 6. Neo-Brutalist Design System

**Key design tokens to define:**
```css
--font-primary: 'Space Grotesk', sans-serif  /* Google Fonts */
--font-mono: 'JetBrains Mono', monospace

/* Neo-Brutalist palette */
--color-bg: #FAFAFA         /* near-white background */
--color-surface: #FFFFFF    /* card/panel surface */
--color-border: #000000     /* thick black borders */
--color-accent: #F5B100     /* yellow accent (primary CTA) */
--color-accent-2: #2B5BFF   /* blue accent (links, info) */
--color-danger: #E53E3E     /* danger/delete */
--color-text: #0A0A0A       /* near-black text */

/* Brutalist rules */
border: 2px solid #000000
box-shadow: 4px 4px 0px #000000
border-radius: 0px  (sharp corners, no rounding)
```

---

## Decisions Locked In

| Decision | Choice | Reason |
|----------|--------|--------|
| ShadCN CLI | `npx shadcn@latest` | Updated CLI name |
| ShadCN style | New York | Sharper, better for Neo-Brutalism |
| Async PostgreSQL driver | `asyncpg` | Best performance for FastAPI |
| JWT lib | `python-jose` | FastAPI official docs recommend it |
| Password hashing | `passlib[bcrypt]` | Standard, well-maintained |
| PostgreSQL version | 17-alpine | Latest stable, small footprint |
| Admin seed | Startup check + env vars | Zero attack surface |
| File storage | Cloudinary (Phase 3) | Out of scope for Phase 1 |
