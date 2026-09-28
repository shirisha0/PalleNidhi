"""
Voice API service: places outbound calls directly via Twilio (no Vapi/Retell
needed). The reminder's generated_prompt is already saved to the database
before this runs; Twilio's webhook (app/routers/twilio_voice.py) fetches it
from there once the call connects.
"""

import asyncio
from twilio.rest import Client

from app.config import settings


def _create_call(to_number: str, reminder_id: int) -> dict:
    client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    call = client.calls.create(
        to=to_number,
        from_=settings.TWILIO_FROM_NUMBER,
        url=f"{settings.PUBLIC_BASE_URL}/twilio/voice?reminder_id={reminder_id}",
    )
    return {"call_sid": call.sid}


async def place_outbound_call(phone_number: str, prompt: str, reminder_id: int) -> dict:
    """Same signature as before, so the scheduler doesn't need any changes."""
    return await asyncio.to_thread(_create_call, phone_number, reminder_id)