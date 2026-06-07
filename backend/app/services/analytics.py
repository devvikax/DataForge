import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.models.form import Form
from app.models.form_field import FormField, FieldType
from app.models.submission import Submission, SubmissionStatus
from app.models.submission_value import SubmissionValue
from app.models.file_upload import FileUpload
from app.models.analytics_cache import AnalyticsCache


async def update_analytics_cache(form_id: uuid.UUID, db: AsyncSession) -> AnalyticsCache:
    """Computes all form submission aggregates and persists in analytics_cache table.
    Returns the updated AnalyticsCache model instance.
    """
    # 1. Fetch form
    form_res = await db.execute(
        select(Form).options(selectinload(Form.fields)).where(Form.id == form_id)
    )
    form = form_res.scalar_one_or_none()
    if not form:
        raise ValueError("Form not found")

    # 2. Fetch all submissions (including EAV values and file uploads)
    submissions_res = await db.execute(
        select(Submission)
        .options(
            selectinload(Submission.values),
            selectinload(Submission.file_uploads)
        )
        .where(Submission.form_id == form_id)
    )
    submissions = submissions_res.scalars().all()

    total_submissions = len(submissions)

    # 3. Status counts (initialize all statuses from enum)
    status_counts = {status.value: 0 for status in SubmissionStatus}
    for sub in submissions:
        status_counts[sub.status.value] += 1

    # 4. Daily counts (last 30 days)
    today = datetime.now(timezone.utc).date()
    dates = [today - timedelta(days=i) for i in range(29, -1, -1)]
    daily_counts_dict = {d.isoformat(): 0 for d in dates}
    for sub in submissions:
        sub_date = sub.submitted_at.date()
        sub_date_str = sub_date.isoformat()
        if sub_date_str in daily_counts_dict:
            daily_counts_dict[sub_date_str] += 1
    daily_counts = [{"date": d, "count": daily_counts_dict[d]} for d in sorted(daily_counts_dict.keys())]

    # 5. Field-level statistics
    field_stats = {}
    for field in form.fields:
        field_id_str = str(field.id)
        response_count = 0
        unique_values = set()
        value_distribution = {}

        is_choice_field = field.field_type in [FieldType.DROPDOWN, FieldType.RADIO, FieldType.CHECKBOX]
        if is_choice_field:
            options = field.options or []
            value_distribution = {opt: 0 for opt in options}

        for sub in submissions:
            if field.field_type == FieldType.FILE:
                # File uploads check metadata table
                file_items = [upload for upload in sub.file_uploads if upload.field_id == field.id]
                if file_items:
                    response_count += 1
                    for item in file_items:
                        unique_values.add(item.cloudinary_url)
            else:
                # Standard fields check EAV table
                sub_val = next((v for v in sub.values if v.field_id == field.id), None)
                if sub_val:
                    if sub_val.value_json is not None:
                        if isinstance(sub_val.value_json, list):
                            if len(sub_val.value_json) > 0:
                                response_count += 1
                                for val in sub_val.value_json:
                                    val_str = str(val).strip()
                                    if val_str:
                                        unique_values.add(val_str)
                                        if is_choice_field and val_str in value_distribution:
                                            value_distribution[val_str] += 1
                        elif sub_val.value_json:
                            response_count += 1
                            val_str = str(sub_val.value_json).strip()
                            unique_values.add(val_str)
                            if is_choice_field and val_str in value_distribution:
                                value_distribution[val_str] += 1
                    elif sub_val.value_text is not None:
                        val_str = sub_val.value_text.strip()
                        if val_str:
                            response_count += 1
                            unique_values.add(val_str)
                            if is_choice_field and val_str in value_distribution:
                                value_distribution[val_str] += 1

        response_rate = (response_count / total_submissions * 100) if total_submissions > 0 else 0.0
        unique_count = len(unique_values)

        field_stats[field_id_str] = {
            "response_rate": round(response_rate, 1),
            "unique_count": unique_count
        }
        if is_choice_field:
            field_stats[field_id_str]["value_distribution"] = value_distribution

    # 6. Save or update cache row
    cache_res = await db.execute(
        select(AnalyticsCache).where(AnalyticsCache.form_id == form_id)
    )
    cache = cache_res.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if cache:
        cache.total_submissions = total_submissions
        cache.status_counts = status_counts
        cache.daily_counts = daily_counts
        cache.field_stats = field_stats
        cache.computed_at = now
    else:
        cache = AnalyticsCache(
            form_id=form_id,
            total_submissions=total_submissions,
            status_counts=status_counts,
            daily_counts=daily_counts,
            field_stats=field_stats,
            computed_at=now
        )
        db.add(cache)

    await db.flush()
    return cache
