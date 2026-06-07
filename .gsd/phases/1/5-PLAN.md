---
phase: 1
plan: 5
wave: 4
depends_on: [1.2, 1.3]
---

# Plan 1.5: Backend Admin Authentication

## Objective
Implement the complete backend authentication system: admin user seeding from environment variables on startup, the `POST /api/auth/login` endpoint returning a JWT, a `GET /api/auth/me` protected endpoint, and the `get_current_admin` FastAPI dependency used to protect all admin routes. After this plan, the backend issues valid JWTs and rejects invalid credentials with correct HTTP status codes.

## Context
- .gsd/SPEC.md
- .gsd/phases/1/RESEARCH.md
- backend/app/core/config.py
- backend/app/core/security.py
- backend/app/db/session.py
- backend/app/models/user.py

## Tasks

<task type="auto">
  <name>Implement admin schemas, user service, and admin seeding on startup</name>
  <files>
    /backend/app/schemas/auth.py
    /backend/app/schemas/user.py
    /backend/app/services/admin_seed.py
    /backend/app/services/user_service.py
  </files>
  <action>
    Create `backend/app/schemas/auth.py`:
    ```python
    from pydantic import BaseModel


    class LoginRequest(BaseModel):
        username: str
        password: str


    class TokenResponse(BaseModel):
        access_token: str
        token_type: str = "bearer"
        expires_in: int  # seconds


    class AdminInfo(BaseModel):
        id: str
        username: str
        is_admin: bool
    ```

    Create `backend/app/schemas/user.py`:
    ```python
    import uuid
    from datetime import datetime
    from pydantic import BaseModel


    class UserRead(BaseModel):
        id: uuid.UUID
        username: str
        is_admin: bool
        is_active: bool
        created_at: datetime

        model_config = {"from_attributes": True}
    ```

    Create `backend/app/services/user_service.py`:
    ```python
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy import select

    from app.models.user import User
    from app.core.security import verify_password


    async def get_user_by_username(session: AsyncSession, username: str) -> User | None:
        result = await session.execute(
            select(User).where(User.username == username, User.is_active == True)
        )
        return result.scalar_one_or_none()


    async def authenticate_user(session: AsyncSession, username: str, password: str) -> User | None:
        user = await get_user_by_username(session, username)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user
    ```

    REPLACE `backend/app/services/admin_seed.py` (replace the stub from Plan 1.2):
    ```python
    import logging
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy import select

    from app.models.user import User
    from app.core.config import settings
    from app.core.security import hash_password

    logger = logging.getLogger(__name__)


    async def seed_admin(session: AsyncSession) -> None:
        """Create the admin user if it doesn't already exist."""
        result = await session.execute(
            select(User).where(User.username == settings.ADMIN_USERNAME)
        )
        existing = result.scalar_one_or_none()

        if existing:
            logger.info("Admin user already exists — skipping seed.")
            return

        admin = User(
            username=settings.ADMIN_USERNAME,
            hashed_password=hash_password(settings.ADMIN_PASSWORD),
            is_admin=True,
            is_active=True,
        )
        session.add(admin)
        await session.commit()
        logger.info(f"Admin user '{settings.ADMIN_USERNAME}' created successfully.")
    ```
  </action>
  <verify>
    PowerShell:
    ```powershell
    Test-Path "backend/app/schemas/auth.py" -and
    Test-Path "backend/app/schemas/user.py" -and
    Test-Path "backend/app/services/user_service.py" -and
    (Select-String -Path "backend/app/services/admin_seed.py" -Pattern "hash_password" -Quiet) -and
    (Select-String -Path "backend/app/services/admin_seed.py" -Pattern "seed_admin" -Quiet)
    ```
    Expected: True
  </verify>
  <done>
    - auth.py schemas: LoginRequest, TokenResponse, AdminInfo defined
    - user_service.py: get_user_by_username and authenticate_user functions
    - admin_seed.py: checks if admin exists before creating; uses hash_password; logs result
    - admin_seed.py is no longer a stub — it creates the real user record
  </done>
</task>

<task type="auto">
  <name>Implement auth router with login endpoint and get_current_admin dependency</name>
  <files>
    /backend/app/routers/auth.py
    /backend/app/core/deps.py
  </files>
  <action>
    Create `backend/app/core/deps.py` — shared FastAPI dependencies:
    ```python
    from fastapi import Depends, HTTPException, status
    from fastapi.security import OAuth2PasswordBearer
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.db.session import get_db
    from app.core.security import decode_access_token
    from app.services.user_service import get_user_by_username
    from app.models.user import User

    oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


    async def get_current_admin(
        token: str = Depends(oauth2_scheme),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        """Dependency that validates JWT and returns the admin user.
        Raises HTTP 401 if token is invalid, expired, or user not found.
        Raises HTTP 403 if user exists but is not admin.
        """
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

        payload = decode_access_token(token)
        if payload is None:
            raise credentials_exception

        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exception

        user = await get_user_by_username(db, username)
        if user is None:
            raise credentials_exception

        if not user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required",
            )

        return user
    ```

    REPLACE `backend/app/routers/auth.py` (replace the stub from Plan 1.2):
    ```python
    from datetime import timedelta
    from fastapi import APIRouter, Depends, HTTPException, status
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.db.session import get_db
    from app.core.config import settings
    from app.core.security import create_access_token
    from app.core.deps import get_current_admin
    from app.schemas.auth import LoginRequest, TokenResponse, AdminInfo
    from app.services.user_service import authenticate_user
    from app.models.user import User

    router = APIRouter()


    @router.post("/login", response_model=TokenResponse)
    async def login(
        credentials: LoginRequest,
        db: AsyncSession = Depends(get_db),
    ) -> TokenResponse:
        """Authenticate admin and return JWT access token."""
        user = await authenticate_user(db, credentials.username, credentials.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required",
            )

        expires_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        access_token = create_access_token(
            subject=user.username,
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        )
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=expires_seconds,
        )


    @router.get("/me", response_model=AdminInfo)
    async def get_me(current_user: User = Depends(get_current_admin)) -> AdminInfo:
        """Return currently authenticated admin's info."""
        return AdminInfo(
            id=str(current_user.id),
            username=current_user.username,
            is_admin=current_user.is_admin,
        )
    ```

    Also update `backend/app/main.py` to import deps (ensure it's registered):
    No change needed — the router is already registered. The `get_current_admin` dependency will be used by future admin routers.
  </action>
  <verify>
    PowerShell:
    ```powershell
    Test-Path "backend/app/core/deps.py" -and
    (Select-String -Path "backend/app/core/deps.py" -Pattern "get_current_admin" -Quiet) -and
    (Select-String -Path "backend/app/routers/auth.py" -Pattern "POST.*login" -Quiet) -and
    (Select-String -Path "backend/app/routers/auth.py" -Pattern "authenticate_user" -Quiet)
    ```
    Expected: True

    Manual test (once backend is running):
    ```bash
    # Should return 401
    curl -X POST http://localhost:8000/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"username": "wrong", "password": "wrong"}'

    # Should return token
    curl -X POST http://localhost:8000/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"username": "admin", "password": "adminpassword123"}'
    ```
  </verify>
  <done>
    - deps.py exports get_current_admin dependency (used by all future admin routers)
    - POST /api/auth/login returns TokenResponse with access_token, token_type, expires_in
    - POST /api/auth/login returns HTTP 401 for wrong credentials (not 422)
    - GET /api/auth/me returns AdminInfo for authenticated admin
    - GET /api/auth/me returns HTTP 401 for missing/invalid token
    - oauth2_scheme uses /api/auth/login as tokenUrl (shows in /docs)
  </done>
</task>

## Success Criteria
- [ ] `POST /api/auth/login` with correct admin credentials returns `{access_token, token_type, expires_in}`
- [ ] `POST /api/auth/login` with wrong credentials returns HTTP 401 (not 200 or 422)
- [ ] `GET /api/auth/me` with valid Bearer token returns admin user info
- [ ] `GET /api/auth/me` with invalid/missing token returns HTTP 401
- [ ] `get_current_admin` dependency is importable from `app.core.deps`
- [ ] Admin user is seeded from env vars on startup — verified by checking it appears in `GET /api/auth/me` after login
- [ ] `GET /docs` shows auth endpoints correctly with OAuth2 lock icons
