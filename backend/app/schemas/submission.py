import uuid
from datetime import datetime
from typing import List, Union, Dict, Any, Optional
from pydantic import BaseModel


class SubmissionValueCreate(BaseModel):
    field_id: uuid.UUID
    # Can be string (text, radio, etc.), list of strings (checkbox), or dict (metadata)
    value: Union[str, List[str], Dict[str, Any], None] = None


class FileUploadCreate(BaseModel):
    field_id: uuid.UUID
    cloudinary_public_id: str
    cloudinary_url: str
    cloudinary_secure_url: str
    original_filename: str
    file_type: str
    file_size_bytes: int


class SubmissionCreate(BaseModel):
    values: List[SubmissionValueCreate]
    file_uploads: List[FileUploadCreate] = []


class SubmissionResponse(BaseModel):
    id: uuid.UUID
    submission_id: str
    status: str
    submitted_at: datetime

    model_config = {"from_attributes": True}


class SubmissionValueRead(BaseModel):
    id: uuid.UUID
    field_id: uuid.UUID
    value_text: Optional[str] = None
    value_json: Optional[Union[List[str], Dict[str, Any], None]] = None

    model_config = {"from_attributes": True}


class FileUploadRead(BaseModel):
    id: uuid.UUID
    field_id: uuid.UUID
    cloudinary_url: str
    cloudinary_secure_url: str
    original_filename: str
    file_type: str
    file_size_bytes: int
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class SubmissionDetailResponse(BaseModel):
    id: uuid.UUID
    form_id: uuid.UUID
    submission_id: str
    status: str
    admin_notes: Optional[str] = None
    submitter_ip: Optional[str] = None
    submitted_at: datetime
    updated_at: datetime
    values: List[SubmissionValueRead]
    file_uploads: List[FileUploadRead]

    model_config = {"from_attributes": True}


class PaginatedSubmissionsResponse(BaseModel):
    submissions: List[SubmissionDetailResponse]
    total_count: int
    page: int
    limit: int
    total_pages: int


class SubmissionStatusUpdate(BaseModel):
    status: str
    admin_notes: Optional[str] = None


class BulkStatusUpdate(BaseModel):
    submission_ids: List[uuid.UUID]
    status: str


class BulkArchiveRequest(BaseModel):
    submission_ids: List[uuid.UUID]

