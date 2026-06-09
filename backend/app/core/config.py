from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    APP_NAME: str = "DataForge API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Firebase Firestore Configuration
    FIREBASE_PROJECT_ID: str = "playsphere-ai"
    FIREBASE_CREDENTIALS_PATH: str | None = None
    FIREBASE_API_KEY: str | None = None
    FIREBASE_AUTH_DOMAIN: str | None = None
    FIREBASE_STORAGE_BUCKET: str | None = None
    FIREBASE_MESSAGING_SENDER_ID: str | None = None
    FIREBASE_APP_ID: str | None = None
    FIREBASE_MEASUREMENT_ID: str | None = None

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Admin credentials (seeded on startup)
    ADMIN_USERNAME: str
    ADMIN_PASSWORD: str

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
