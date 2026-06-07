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
