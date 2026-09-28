"""
GenAI service: generates the natural-language call prompt for a reminder,
and classifies the person's spoken reply from the call transcript.

Both functions fall back to simple non-AI behavior if the LLM API is
unavailable (no key, quota exceeded, network error), so a failing API
never breaks a live call.
"""

import re

import httpx

from app.config import settings
from app.models.reminder import Reminder


SYSTEM_PROMPT = (
    "You write short, natural, polite call scripts for an AI voice assistant "
    "that phones people to remind them about a task or deadline. "
    "Keep it under 60 words and first-person as the assistant. "
    "Always end with exactly this instruction: "
    "'Please say yes to confirm, or say reschedule if you need more time.'"
)

INTENT_SYSTEM_PROMPT = (
    "You classify the outcome of a reminder phone call from its transcript. "
    "Respond with exactly one word: confirmed, rescheduled, voicemail, no_answer, or unclear."
)

CONFIRM_WORDS = {"yes", "yeah", "yep", "yup", "sure", "confirm", "confirmed", "okay", "ok", "done"}
RESCHEDULE_WORDS = {
    "reschedule", "rescheduled", "later", "postpone", "extension",
    "extend", "tomorrow", "no", "nope", "not",
}


async def generate_call_prompt(reminder: Reminder, contact_name: str) -> str:
    """Generate a dynamic voice prompt for the given reminder using an LLM.
    Falls back to a plain template if GenAI is unavailable."""
    fallback = (
        f"Hi {contact_name}, this is a reminder that {reminder.context}. "
        "Please say yes to confirm, or say reschedule if you need more time."
    )

    if not settings.GENAI_API_KEY:
        return fallback

    user_message = (
        f"Contact name: {contact_name}\n"
        f"Reminder context: {reminder.context}\n"
        f"Scheduled time: {reminder.scheduled_time.isoformat()}\n\n"
        "Write the call script now."
    )

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.GENAI_API_KEY}"},
                json={
                    "model": settings.GENAI_MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_message},
                    ],
                    "temperature": 0.6,
                },
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
    except Exception:
        return fallback


async def classify_call_intent(transcript: str) -> str:
    """Classify the outcome of a call from its transcript.
    Simple keyword rules first (free and instant), then the LLM for
    anything ambiguous. Never raises."""
    if not transcript:
        return "no_answer"

    words = set(re.findall(r"[a-z']+", transcript.lower()))

    # Check reschedule first so "yes, I need an extension" isn't read as a plain yes.
    if words & RESCHEDULE_WORDS:
        return "rescheduled"
    if words & CONFIRM_WORDS:
        return "confirmed"

    if not settings.GENAI_API_KEY:
        return "unclear"

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.GENAI_API_KEY}"},
                json={
                    "model": settings.GENAI_MODEL,
                    "messages": [
                        {"role": "system", "content": INTENT_SYSTEM_PROMPT},
                        {"role": "user", "content": transcript},
                    ],
                    "temperature": 0,
                },
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip().lower()
    except Exception:
        return "unclear"