import logging
from google.cloud import firestore

from app.models.user import User
from app.core.config import settings
from app.core.security import hash_password

logger = logging.getLogger(__name__)


async def seed_admin(db: firestore.AsyncClient) -> None:
    """Create the admin user in Firestore if it doesn't already exist."""
    users_ref = db.collection("users")
    docs = await users_ref.where("username", "==", settings.ADMIN_USERNAME).limit(1).get()

    if docs:
        logger.info("Admin user already exists — skipping seed.")
        return

    admin = User(
        username=settings.ADMIN_USERNAME,
        hashed_password=hash_password(settings.ADMIN_PASSWORD),
        is_admin=True,
        is_active=True,
    )
    
    admin_dict = {
        "id": str(admin.id),
        "username": admin.username,
        "hashed_password": admin.hashed_password,
        "is_admin": admin.is_admin,
        "is_active": admin.is_active
    }
    
    await users_ref.document(str(admin.id)).set(admin_dict)
    logger.info(f"Admin user '{settings.ADMIN_USERNAME}' created successfully in Firestore.")
