import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.form_field import FormFieldRead


class FormBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    is_active: bool = True
    unique_field_ids: List[str] = []


class FormCreate(FormBase):
    pass


class FormUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    unique_field_ids: Optional[List[str]] = None


class FormRead(FormBase):
    id: uuid.UUID
    submission_counter: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FormDetailRead(FormRead):
    fields: List[FormFieldRead] = []

    model_config = {"from_attributes": True}


class FieldReorderRequest(BaseModel):
    field_ids: List[uuid.UUID]


class DailyCount(BaseModel):
    date: str
    count: int


class FormAnalyticsResponse(BaseModel):
    total_submissions: int
    today_submissions: int
    approval_rate: float
    pending_count: int
    status_counts: dict
    daily_counts: List[DailyCount]
    field_stats: dict
    computed_at: datetime


class AdminStatsResponse(BaseModel):
    total_forms: int
    total_submissions: int
    pending_submissions: int
    edit_requests: int


