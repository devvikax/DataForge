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
