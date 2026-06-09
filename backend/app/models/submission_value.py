import uuid

class SubmissionValue:
    """Plain Python SubmissionValue class for Firestore backing."""
    def __init__(
        self,
        id=None,
        submission_id=None,
        field_id=None,
        value_text=None,
        value_json=None
    ):
        self.id = id if isinstance(id, uuid.UUID) else uuid.UUID(id) if id else uuid.uuid4()
        self.submission_id = submission_id if isinstance(submission_id, uuid.UUID) else uuid.UUID(submission_id) if submission_id else None
        self.field_id = field_id if isinstance(field_id, uuid.UUID) else uuid.UUID(field_id) if field_id else None
        self.value_text = value_text
        self.value_json = value_json
