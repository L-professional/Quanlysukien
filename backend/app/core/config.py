from typing import Optional
from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", ".env.local", "../.env.local"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # General App Config
    PROJECT_NAME: str = "EventHub AI"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:8080"

    # PostgreSQL Database
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "eventhub"
    DATABASE_URL: Optional[str] = None

    @computed_field
    @property
    def async_database_url(self) -> str:
        if self.DATABASE_URL:
            # Ensure dialect is postgresql+asyncpg
            if self.DATABASE_URL.startswith("postgresql://"):
                return self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
            return self.DATABASE_URL
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Redis Cache & Session
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_URL: Optional[str] = None

    @computed_field
    @property
    def async_redis_url(self) -> str:
        if self.REDIS_URL:
            return self.REDIS_URL
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    # AI Configuration (Gemini API)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_EMBEDDING_MODEL: str = "text-embedding-004"

    # JWT Authentication
    SECRET_KEY: str = "eventhub_ai_secret_key_super_secure_jwt_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # SMTP & Email Configuration
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    SMTP_FROM: str = "EventAI System <noreply@eventhub.ai>"
    SMTP_SECURE: bool = False
    RESEND_API_KEY: str = ""

    # SMS Gateway Configuration (eSMS.vn / SpeedSMS / Twilio)
    ESMS_API_KEY: str = ""
    ESMS_SECRET_KEY: str = ""
    ESMS_BRANDNAME: str = "EVENTHUB"
    SPEEDSMS_ACCESS_TOKEN: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""

    # Zalo Official Account & ZNS Configuration
    ZALO_OA_ID: str = ""
    ZALO_APP_ID: str = ""
    ZALO_SECRET_KEY: str = ""
    ZALO_ACCESS_TOKEN: str = ""
    ZALO_REFRESH_TOKEN: str = ""
    ZALO_TEMPLATE_ID: str = ""


settings = Settings()
