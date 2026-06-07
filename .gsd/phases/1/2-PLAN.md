---
phase: 1
plan: 2
wave: 1
depends_on: []
---

# Plan 1.2: FastAPI Application Skeleton & Configuration

## Objective
Build the complete FastAPI application skeleton — project structure, settings management with pydantic-settings, CORS configuration, logging, and a working health check endpoint. After this plan, the backend starts cleanly, `/api/health` returns `{"status": "ok"}`, and all configuration is driven from environment variables.

## Context
- .gsd/SPEC.md
- .gsd/phases/1/RESEARCH.md

## Tasks

<task type="auto">
  <name>Create FastAPI project structure, requirements.txt, and core config</name>
  <files>
    /backend/requirements.txt
    /backend/app/__init__.py
    /backend/app/core/__init__.py
    /backend/app/core/config.py
    /backend/app/core/security.py
    /backend/app/db/__init__.py
    /backend/app/db/base.py
    /backend/app/db/session.py
    /backend/app/models/__init__.py
    /backend/app/schemas/__init__.py
    /backend/app/routers/__init__.py
    /backend/app/services/__init__.py
  </files>
  <action>
    Create `backend/requirements.txt`:
    ```
    fastapi==0.115.5
    uvicorn[standard]==0.32.1
    sqlalchemy[asyncio]==2.0.36
    asyncpg==0.30.0
    alembic==1.14.0
    pydantic-settings==2.6.1
    pydantic[email]==2.10.3
    python-jose[cryptography]==3.3.0
    passlib[bcrypt]==1.7.4
    python-multipart==0.0.19
    cloudinary==1.41.0
    openpyxl==3.1.5
    httpx==0.28.0
    python-dotenv==1.0.1
    ```

    Create `backend/app/core/config.py`:
    ```python
    from pydantic_settings import BaseSettings, SettingsConfigDict
    from functools import lru_cache


    class Settings(BaseSettings):
        model_config = SettingsConfigDict(
            env_file=".env",
            env_file_encoding="utf-8",
            case_sensitive=False,
            extra="ignore",
        )

        # Application
        APP_NAME: str = "DataForge API"
        APP_VERSION: str = "1.0.0"
        DEBUG: bool = False

        # Database
        DATABASE_URL: str

        # Security
        SECRET_KEY: str
        ALGORITHM: str = "HS256"
        ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

        # Admin credentials (seeded on startup)
        ADMIN_USERNAME: str
        ADMIN_PASSWORD: str

        # CORS
        ALLOWED_ORIGINS: str = "http://localhost:3000"

        @property
        def origins_list(self) -> list[str]:
            return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

        # Cloudinary
        CLOUDINARY_CLOUD_NAME: str = ""
        CLOUDINARY_API_KEY: str = ""
        CLOUDINARY_API_SECRET: str = ""


    @lru_cache
    def get_settings() -> Settings:
        return Settings()


    settings = get_settings()
    ```

    Create `backend/app/core/security.py`:
    ```python
    from datetime import datetime, timedelta, timezone
    from typing import Any

    from jose import JWTError, jwt
    from passlib.context import CryptContext

    from app.core.config import settings

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)


    def hash_password(password: str) -> str:
        return pwd_context.hash(password)


    def create_access_token(subject: Any, expires_delta: timedelta | None = None) -> str:
        expire = datetime.now(timezone.utc) + (
            expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        payload = {"sub": str(subject), "exp": expire, "iat": datetime.now(timezone.utc)}
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


    def decode_access_token(token: str) -> dict | None:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            return payload
        except JWTError:
            return None
    ```

    Create `backend/app/db/base.py`:
    ```python
    from sqlalchemy.orm import DeclarativeBase


    class Base(DeclarativeBase):
        pass
    ```

    Create `backend/app/db/session.py`:
    ```python
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from typing import AsyncGenerator

    from app.core.config import settings

    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )

    AsyncSessionLocal = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


    async def get_db() -> AsyncGenerator[AsyncSession, None]:
        async with AsyncSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
    ```

    Create all `__init__.py` files as empty files.
  </action>
  <verify>
    PowerShell:
    ```powershell
    Test-Path "backend/requirements.txt" -and
    Test-Path "backend/app/core/config.py" -and
    Test-Path "backend/app/core/security.py" -and
    Test-Path "backend/app/db/session.py" -and
    Test-Path "backend/app/db/base.py"
    ```
    Expected: True
  </verify>
  <done>
    - requirements.txt exists with all pinned dependencies
    - config.py uses pydantic-settings with @lru_cache singleton
    - security.py has verify_password, hash_password, create_access_token, decode_access_token
    - session.py has async engine, async_sessionmaker, and get_db dependency generator
    - db/base.py has DeclarativeBase
    - All __init__.py files exist in all packages
  </done>
</task>

<task type="auto">
  <name>Create FastAPI main application with CORS, routers, lifespan, and health endpoint</name>
  <files>
    /backend/app/main.py
    /backend/app/routers/health.py
    /backend/app/routers/auth.py
  </files>
  <action>
    Create `backend/app/main.py`:
    ```python
    from contextlib import asynccontextmanager
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware

    from app.core.config import settings
    from app.routers import health, auth


    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # Startup: seed admin user if not exists
        from app.db.session import AsyncSessionLocal
        from app.services.admin_seed import seed_admin
        async with AsyncSessionLocal() as session:
            await seed_admin(session)
        yield
        # Shutdown: nothing to clean up in v1


    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    app.include_router(health.router, prefix="/api", tags=["health"])
    app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    ```

    Create `backend/app/routers/health.py`:
    ```python
    from fastapi import APIRouter, Depends
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy import text

    from app.db.session import get_db

    router = APIRouter()


    @router.get("/health")
    async def health_check(db: AsyncSession = Depends(get_db)):
        """Health check endpoint — verifies API and database connectivity."""
        try:
            await db.execute(text("SELECT 1"))
            db_status = "connected"
        except Exception as e:
            db_status = f"error: {str(e)}"

        return {
            "status": "ok",
            "database": db_status,
            "version": "1.0.0",
        }
    ```

    Create `backend/app/routers/auth.py` as a stub (full implementation in Plan 1.5):
    ```python
    from fastapi import APIRouter

    router = APIRouter()

    # Auth routes implemented in Plan 1.5
    ```

    Create `backend/app/services/__init__.py` as empty.

    Create `backend/app/services/admin_seed.py` as a stub (full implementation in Plan 1.5):
    ```python
    from sqlalchemy.ext.asyncio import AsyncSession


    async def seed_admin(session: AsyncSession) -> None:
        """Seed the admin user if not exists. Implemented in Plan 1.5."""
        pass
    ```
  </action>
  <verify>
    PowerShell:
    ```powershell
    Test-Path "backend/app/main.py" -and
    Test-Path "backend/app/routers/health.py" -and
    (Select-String -Path "backend/app/main.py" -Pattern "CORSMiddleware" -Quiet) -and
    (Select-String -Path "backend/app/main.py" -Pattern "lifespan" -Quiet)
    ```
    Expected: True
  </verify>
  <done>
    - main.py uses lifespan context manager (not deprecated @app.on_event)
    - CORS middleware configured with settings.origins_list
    - /api/health route returns {"status": "ok", "database": "connected", "version": ...}
    - auth router stub exists and is registered
    - admin_seed stub exists (no-op until Plan 1.5)
  </done>
</task>

## Success Criteria
- [ ] `backend/requirements.txt` contains all required packages with pinned versions
- [ ] `backend/app/core/config.py` reads all settings from environment using pydantic-settings
- [ ] `backend/app/core/security.py` implements password hashing and JWT operations
- [ ] `backend/app/db/session.py` provides async SQLAlchemy session via dependency injection
- [ ] `backend/app/main.py` initializes FastAPI with CORS, lifespan, and registered routers
- [ ] `GET /api/health` endpoint exists and verifies database connectivity
