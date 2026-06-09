from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import health, auth, forms, uploads, submissions


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: seed admin user if not exists
    import logging
    logger = logging.getLogger(__name__)
    try:
        from app.db.session import db
        from app.services.admin_seed import seed_admin
        await seed_admin(db)
    except Exception as e:
        logger.warning(
            f"Admin seed skipped — could not connect to Firestore at startup: {e}. "
            "Ensure FIREBASE_CREDENTIALS_PATH or GOOGLE_APPLICATION_CREDENTIALS is set."
        )
    yield
    # Shutdown: nothing to clean up in v1


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(forms.router, prefix="/api/forms", tags=["forms"])
app.include_router(uploads.router, prefix="/api/uploads", tags=["uploads"])
app.include_router(submissions.router, prefix="/api/submissions", tags=["submissions"])
