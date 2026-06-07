import uuid
from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel


class FormFieldBase(BaseModel):
    field_type: str  # text, textarea, number, email, phone, date, dropdown, radio, checkbox, file
    label: str
    placeholder: Optional[str] = None
    description: Optional[str] = None
    default_value: Optional[str] = None
    is_required: bool = False
    order: int = 0
    options: Optional[List[str]] = None
    conditions: Optional[List[dict]] = None
    file_accepted_types: Optional[List[str]] = None
    file_max_size_mb: Optional[int] = None
    file_max_count: Optional[int] = None


class FormFieldCreate(FormFieldBase):
    pass


class FormFieldUpdate(FormFieldBase):
    id: Optional[uuid.UUID] = None  # Needed for bulk updates/upserts


class FormFieldRead(FormFieldBase):
    id: uuid.UUID
    form_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
