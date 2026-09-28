import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Database
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "3306")
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "voice_reminder_db")

    SQLALCHEMY_DATABASE_URL = (
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )

    # GenAI (OpenAI-compatible; swap base_url/model for Claude or others)
    GENAI_API_KEY = os.getenv("GENAI_API_KEY", "")
    GENAI_MODEL = os.getenv("GENAI_MODEL", "gpt-4o-mini")

    # Voice API (Vapi / Retell)
    VOICE_API_KEY = os.getenv("VOICE_API_KEY", "")
    VOICE_API_BASE_URL = os.getenv("VOICE_API_BASE_URL", "https://api.vapi.ai")
    VOICE_ASSISTANT_ID = os.getenv("VOICE_ASSISTANT_ID", "")
    VOICE_PHONE_NUMBER_ID = os.getenv("VOICE_PHONE_NUMBER_ID", "")
    # Twilio (direct)
    TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "")
    PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "")
    # Webhook security
    WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "")

    # Scheduler
    SCHEDULER_POLL_INTERVAL_SECONDS = int(os.getenv("SCHEDULER_POLL_INTERVAL_SECONDS", "60"))


settings = Settings()
