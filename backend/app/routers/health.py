from fastapi import APIRouter, Depends
from google.cloud import firestore

from app.db.session import get_db

router = APIRouter()


@router.get("/health")
async def health_check(db: firestore.AsyncClient = Depends(get_db)):
    """Health check endpoint — verifies API and Firestore connectivity."""
    try:
        # Attempt a lightweight Firestore read to verify connectivity
        await db.collection("_health").document("ping").get()
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "ok",
        "database": db_status,
        "version": "1.0.0",
    }
