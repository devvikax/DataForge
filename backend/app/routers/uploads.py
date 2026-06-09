import uuid
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from google.cloud import firestore
import cloudinary
import cloudinary.uploader

from app.db.session import get_db
from app.core.config import settings
from app.models.form_field import FormField, FieldType

router = APIRouter()
logger = logging.getLogger(__name__)

# Configure Cloudinary if credentials are provided
if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True
    )
    logger.info("Cloudinary configured successfully.")
else:
    logger.warning("Cloudinary credentials not set. Uploads will fallback to mock mode.")


@router.post("/", status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    form_field_id: uuid.UUID = Form(...),
    db: firestore.AsyncClient = Depends(get_db),
):
    """Uploads file to Cloudinary after verifying constraints against form field config.
    Falls back to mock response if Cloudinary keys are unconfigured.
    """
    # Find the field in forms from Firestore
    forms_docs = await db.collection("forms").get()
    field = None
    for doc in forms_docs:
        data = doc.to_dict()
        fields_data = data.get("fields", [])
        for f in fields_data:
            if f.get("id") == str(form_field_id):
                field = FormField(
                    id=uuid.UUID(f.get("id")),
                    form_id=uuid.UUID(doc.id),
                    field_type=FieldType(f.get("field_type")),
                    label=f.get("label", ""),
                    placeholder=f.get("placeholder"),
                    description=f.get("description"),
                    default_value=f.get("default_value"),
                    is_required=f.get("is_required", False),
                    order=f.get("order", 0),
                    options=f.get("options"),
                    conditions=f.get("conditions"),
                    file_accepted_types=f.get("file_accepted_types"),
                    file_max_size_mb=f.get("file_max_size_mb"),
                    file_max_count=f.get("file_max_count"),
                )
                break
        if field:
            break
    
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form field not found."
        )
        
    if field.field_type != FieldType.FILE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Specified field is not a file upload field."
        )

    # 1. Validate file size
    file.file.seek(0, 2)
    size_bytes = file.file.tell()
    file.file.seek(0)
    
    size_mb = size_bytes / (1024 * 1024)
    max_size_mb = field.file_max_size_mb or 5
    
    if size_mb > max_size_mb:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size ({size_mb:.2f} MB) exceeds maximum allowed size ({max_size_mb} MB)."
        )

    # 2. Validate MIME type
    if field.file_accepted_types:
        allowed_types = []
        for item in field.file_accepted_types:
            allowed_types.extend([t.strip() for t in item.split(",")])
            
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {file.content_type} is not accepted. Allowed: {', '.join(allowed_types)}"
            )

    # 3. Perform Upload
    is_configured = bool(
        settings.CLOUDINARY_CLOUD_NAME and 
        settings.CLOUDINARY_API_KEY and 
        settings.CLOUDINARY_API_SECRET
    )

    if is_configured:
        try:
            file_bytes = await file.read()
            upload_result = cloudinary.uploader.upload(
                file_bytes,
                folder="dataforge",
                resource_type="auto"
            )
            cloudinary_public_id = upload_result["public_id"]
            cloudinary_url = upload_result["url"]
            cloudinary_secure_url = upload_result["secure_url"]
        except Exception as e:
            logger.error(f"Cloudinary upload error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Cloudinary upload failed: {str(e)}"
            )
    else:
        logger.warning(f"Mock upload fallback triggered for file: {file.filename}")
        mock_id = f"mock_{uuid.uuid4().hex}"
        safe_filename = file.filename.replace(" ", "_") if file.filename else "file"
        cloudinary_public_id = f"dataforge/mock/{mock_id}"
        cloudinary_url = f"http://localhost:8000/mock-uploads/{mock_id}/{safe_filename}"
        cloudinary_secure_url = f"https://localhost:8000/mock-uploads/{mock_id}/{safe_filename}"

    return {
        "cloudinary_public_id": cloudinary_public_id,
        "cloudinary_url": cloudinary_url,
        "cloudinary_secure_url": cloudinary_secure_url,
        "original_filename": file.filename,
        "file_type": file.content_type,
        "file_size_bytes": size_bytes
    }
