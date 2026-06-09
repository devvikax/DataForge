import uuid
from datetime import datetime, timezone, timedelta
from google.cloud import firestore

from app.models.form_field import FieldType
from app.models.submission import SubmissionStatus
from app.models.analytics_cache import AnalyticsCache
from app.utils.converters import dict_to_form, dict_to_submission


async def update_analytics_cache(form_id: uuid.UUID, db: firestore.AsyncClient) -> AnalyticsCache:
    """Computes all form submission aggregates and persists in analytics_cache collection.
    Returns the updated AnalyticsCache model instance.
    """
    # 1. Fetch form
    form_doc = await db.collection("forms").document(str(form_id)).get()
    if not form_doc.exists:
        raise ValueError("Form not found")
    form = dict_to_form(form_doc.id, form_doc.to_dict())

    # 2. Fetch all submissions
    subs_docs = await db.collection("submissions").where("form_id", "==", str(form_id)).get()
    submissions = [dict_to_submission(doc.id, doc.to_dict()) for doc in subs_docs]

    total_submissions = len(submissions)

    # 3. Status counts
    status_counts = {status.value: 0 for status in SubmissionStatus}
    for sub in submissions:
        status_value = sub.status.value if hasattr(sub.status, "value") else str(sub.status)
        if status_value in status_counts:
            status_counts[status_value] += 1
        else:
            status_counts[status_value] = 1

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
                file_items = [upload for upload in sub.file_uploads if upload.field_id == field.id]
                if file_items:
                    response_count += 1
                    for item in file_items:
                        if item.cloudinary_url:
                            unique_values.add(item.cloudinary_url)
            else:
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

    # 6. Save or update cache document in Firestore
    cache_ref = db.collection("analytics_cache").document(str(form_id))
    now = datetime.now(timezone.utc)
    
    cache_data = {
        "id": str(form_id),
        "form_id": str(form_id),
        "total_submissions": total_submissions,
        "status_counts": status_counts,
        "daily_counts": daily_counts,
        "field_stats": field_stats,
        "computed_at": now
    }
    await cache_ref.set(cache_data)

    return AnalyticsCache(
        id=form_id,
        form_id=form_id,
        total_submissions=total_submissions,
        status_counts=status_counts,
        daily_counts=daily_counts,
        field_stats=field_stats,
        computed_at=now
    )
