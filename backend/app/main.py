from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import health, auth, forms, uploads


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: seed admin user if not exists
    from app.db.session import AsyncSessionLocal
    from app.services.admin_seed import seed_admin
    async with AsyncSessionLocal() as session:
        await seed_admin(session)
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
