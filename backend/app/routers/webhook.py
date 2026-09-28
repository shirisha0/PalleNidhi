import json

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.reminder import Reminder, ReminderStatus
from app.models.call_log import CallLog
from app.schemas.call_log import VoiceWebhookPayload
from app.services.genai_service import classify_call_intent

router = APIRouter(prefix="/webhook", tags=["Webhook"])

# Map classified/provider intent strings to our ReminderStatus enum
INTENT_TO_STATUS = {
    "confirmed": ReminderStatus.confirmed,
    "rescheduled": ReminderStatus.rescheduled,
    "voicemail": ReminderStatus.failed,
    "no_answer": ReminderStatus.failed,
    "unclear": ReminderStatus.completed,
}


@router.post("/call-status")
async def call_status_webhook(request: Request, db: Session = Depends(get_db)):
    # Optional shared-secret check - adjust to match your provider's auth scheme
    if settings.WEBHOOK_SECRET:
        provided = request.headers.get("x-webhook-secret")
        if provided != settings.WEBHOOK_SECRET:
            raise HTTPException(status_code=401, detail="Invalid webhook secret")

    raw_body = await request.body()
    body = json.loads(raw_body)

    payload = VoiceWebhookPayload(**body)

    reminder = None
    if payload.reminder_id:
        reminder = db.query(Reminder).filter(Reminder.id == payload.reminder_id).first()

    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found for this call")

    # Use provider status if it already classifies outcome, else fall back to GenAI
    intent = payload.status
    if not intent or intent not in INTENT_TO_STATUS:
        intent = await classify_call_intent(payload.transcript or "")

    call_log = CallLog(
        reminder_id=reminder.id,
        call_provider_id=payload.call_id,
        transcript=payload.transcript,
        duration_seconds=payload.duration_seconds,
        extracted_intent=intent,
        raw_payload=raw_body.decode("utf-8"),
    )
    db.add(call_log)

    reminder.status = INTENT_TO_STATUS.get(intent, ReminderStatus.completed)
    db.commit()

    return {"ok": True, "reminder_id": reminder.id, "status": reminder.status}
