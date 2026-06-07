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
