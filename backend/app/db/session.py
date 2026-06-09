import os
from typing import AsyncGenerator
import google.oauth2.service_account
import google.auth
import google.auth.credentials
import google.auth.exceptions
from google.cloud import firestore

from app.core.config import settings

# Initialize Google Cloud Firestore AsyncClient
try:
    if settings.FIREBASE_CREDENTIALS_PATH and os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
        cred = google.oauth2.service_account.Credentials.from_service_account_file(
            settings.FIREBASE_CREDENTIALS_PATH
        )
        db = firestore.AsyncClient(credentials=cred, project=cred.project_id)
    else:
        # Initialize using default credentials or project ID
        db = firestore.AsyncClient(project=settings.FIREBASE_PROJECT_ID)
except google.auth.exceptions.DefaultCredentialsError:
    # Fallback to anonymous credentials so uvicorn can start up without crashing.
    # This is also useful for local emulator testing.
    anon_cred = google.auth.credentials.AnonymousCredentials()
    db = firestore.AsyncClient(project=settings.FIREBASE_PROJECT_ID, credentials=anon_cred)

async def get_db() -> AsyncGenerator[firestore.AsyncClient, None]:
    """Dependency to retrieve the async Firestore client."""
    yield db
