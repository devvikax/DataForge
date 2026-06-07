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
