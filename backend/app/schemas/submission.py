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
