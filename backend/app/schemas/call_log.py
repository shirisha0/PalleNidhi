from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class CallLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reminder_id: int
    call_provider_id: Optional[str] = None
    transcript: Optional[str] = None
    duration_seconds: Optional[float] = None
    extracted_intent: Optional[str] = None
    created_at: datetime


class VoiceWebhookPayload(BaseModel):
    """Generic shape for what a voice provider (Vapi/Retell) posts on call completion.
    Adjust field names to match the exact provider you integrate with."""

    call_id: str
    reminder_id: Optional[int] = None  # if you pass it as metadata when placing the call
    phone_number: Optional[str] = None
    transcript: Optional[str] = None
    duration_seconds: Optional[float] = None
    status: Optional[str] = None  # e.g. "completed", "no-answer", "voicemail"
