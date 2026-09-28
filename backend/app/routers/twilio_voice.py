from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, Form
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.reminder import Reminder, ReminderStatus
from app.models.call_log import CallLog
from app.services.genai_service import classify_call_intent

router = APIRouter(prefix="/twilio", tags=["Twilio Voice"])

INTENT_TO_STATUS = {
    "confirmed": ReminderStatus.confirmed,
    "rescheduled": ReminderStatus.rescheduled,
    "voicemail": ReminderStatus.failed,
    "no_answer": ReminderStatus.failed,
    "unclear": ReminderStatus.completed,
}


@router.post("/voice")
async def voice_entry(reminder_id: int, db: Session = Depends(get_db)):
    """Twilio hits this the moment the call connects. Returns TwiML telling
    Twilio what to say and that it should listen for a spoken reply."""
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    message = (
        reminder.generated_prompt
        if reminder and reminder.generated_prompt
        else "Hello, this is a reminder call."
    )
    # generated_prompt could contain characters (&, <, >, quotes) that would
    # break the TwiML XML if not escaped.
    safe_message = escape(message)

    # Full public URL so Twilio never has to guess the domain.
    action_url = f"{settings.PUBLIC_BASE_URL}/twilio/gather-response?reminder_id={reminder_id}"

    print(f"📞 VOICE ENTRY — reminder_id={reminder_id}, action_url={action_url}")

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather input="speech" action="{action_url}" method="POST" speechTimeout="auto" timeout="6" actionOnEmptyResult="true">
        <Say voice="Polly.Joanna">{safe_message}</Say>
    </Gather>
    <Say voice="Polly.Joanna">We did not catch a response. Goodbye.</Say>
</Response>"""
    return Response(content=twiml, media_type="application/xml")


@router.post("/gather-response")
async def gather_response(
    reminder_id: int,
    SpeechResult: str = Form(default=""),
    db: Session = Depends(get_db),
):
    """Twilio hits this after the person finishes speaking (or after the
    gather timeout), with the transcribed text in SpeechResult, which
    may be empty."""
    print(f"🔔 GATHER HIT — reminder_id={reminder_id}, SpeechResult='{SpeechResult}'")

    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()

    if not reminder:
        print(f"⚠️ No reminder found for id={reminder_id}")
        twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">Sorry, something went wrong. Goodbye.</Say>
    <Hangup/>
</Response>"""
        return Response(content=twiml, media_type="application/xml")

    intent = await classify_call_intent(SpeechResult)

    call_log = CallLog(
        reminder_id=reminder.id,
        transcript=SpeechResult,
        extracted_intent=intent,
    )
    db.add(call_log)
    reminder.status = INTENT_TO_STATUS.get(intent, ReminderStatus.completed)
    db.commit()

    reply = "Thanks, got it. Goodbye." if intent == "confirmed" else "Okay, noted. Goodbye."
    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">{escape(reply)}</Say>
    <Hangup/>
</Response>"""
    return Response(content=twiml, media_type="application/xml")