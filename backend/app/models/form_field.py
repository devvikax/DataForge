import enum
import uuid
from datetime import datetime, timezone

class FieldType(str, enum.Enum):
    TEXT = "text"
    TEXTAREA = "textarea"
    NUMBER = "number"
    EMAIL = "email"
    PHONE = "phone"
    DATE = "date"
    DROPDOWN = "dropdown"
    RADIO = "radio"
    CHECKBOX = "checkbox"
    FILE = "file"

class FormField:
    """Plain Python FormField class for Firestore backing."""
    def __init__(
        self,
        id=None,
        form_id=None,
        field_type=None,
        label="",
        placeholder=None,
        description=None,
        default_value=None,
        is_required=False,
        order=0,
        options=None,
        conditions=None,
        file_accepted_types=None,
        file_max_size_mb=None,
        file_max_count=None,
        created_at=None,
        updated_at=None
    ):
        self.id = id if isinstance(id, uuid.UUID) else uuid.UUID(id) if id else uuid.uuid4()
        self.form_id = form_id if isinstance(form_id, uuid.UUID) else uuid.UUID(form_id) if form_id else None
        self.field_type = field_type
        self.label = label
        self.placeholder = placeholder
        self.description = description
        self.default_value = default_value
        self.is_required = is_required
        self.order = order
        self.options = options
        self.conditions = conditions
        self.file_accepted_types = file_accepted_types
        self.file_max_size_mb = file_max_size_mb
        self.file_max_count = file_max_count
        self.created_at = created_at or datetime.now(timezone.utc)
        self.updated_at = updated_at or datetime.now(timezone.utc)
