from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from google.cloud import firestore

from app.db.session import get_db
from app.core.security import decode_access_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_admin(
    token: str = Depends(oauth2_scheme),
    db: firestore.AsyncClient = Depends(get_db),
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

    # Query user from Firestore
    users_ref = db.collection("users")
    query = users_ref.where("username", "==", username).where("is_active", "==", True).limit(1)
    docs = await query.get()
    
    if not docs:
        raise credentials_exception

    doc = docs[0]
    data = doc.to_dict()
    user = User(
        id=data.get("id"),
        username=data.get("username"),
        hashed_password=data.get("hashed_password"),
        is_admin=data.get("is_admin", True),
        is_active=data.get("is_active", True)
    )

    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    return user
