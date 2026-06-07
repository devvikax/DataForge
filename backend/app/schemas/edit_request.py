import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.edit_request import EditRequestStatus
from app.schemas.form import FormDetailRead
from app.schemas.submission import SubmissionValueRead, FileUploadRead


class EditRequestCreate(BaseModel):
    submission_id: str
    reason: str


class EditRequestResponse(BaseModel):
    id: uuid.UUID
    submission_id: uuid.UUID
    reason: str
    status: EditRequestStatus
    admin_note: Optional[str] = None
    edit_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    token_used: bool
    created_at: datetime
    reviewed_at: Optional[datetime] = None

    # Custom fields for admin convenience
    form_name: Optional[str] = None
    human_submission_id: Optional[str] = None

    model_config = {"from_attributes": True}


class EditRequestApprove(BaseModel):
    admin_note: Optional[str] = None


class EditRequestReject(BaseModel):
    admin_note: Optional[str] = None


class EditRequestFormDetail(BaseModel):
    form: FormDetailRead
    submission_id: uuid.UUID
    values: List[SubmissionValueRead]
    file_uploads: List[FileUploadRead]
