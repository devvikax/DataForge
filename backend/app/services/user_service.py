from google.cloud import firestore
from app.models.user import User
from app.core.security import verify_password


async def get_user_by_username(db: firestore.AsyncClient, username: str) -> User | None:
    """Fetch user by username from Firestore."""
    users_ref = db.collection("users")
    query = users_ref.where("username", "==", username).where("is_active", "==", True).limit(1)
    docs = await query.get()
    if not docs:
        return None
    data = docs[0].to_dict()
    return User(
        id=data.get("id"),
        username=data.get("username"),
        hashed_password=data.get("hashed_password"),
        is_admin=data.get("is_admin", True),
        is_active=data.get("is_active", True)
    )


async def authenticate_user(db: firestore.AsyncClient, username: str, password: str) -> User | None:
    """Authenticate user credentials using Firestore data."""
    user = await get_user_by_username(db, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user
