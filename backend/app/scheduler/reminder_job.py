import asyncio
import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models.reminder import Reminder, ReminderStatus
from app.services.genai_service import generate_call_prompt
from app.services.voice_api_service import place_outbound_call

logger = logging.getLogger("reminder_scheduler")


async def process_due_reminders():
    """Poll the DB for reminders due now, generate a prompt, and place calls."""
    db: Session = SessionLocal()
    try:
        due_reminders = (
            db.query(Reminder)
            .filter(
                Reminder.status == ReminderStatus.pending,
                Reminder.scheduled_time <= datetime.utcnow(),
            )
            .all()
        )

        for reminder in due_reminders:
            try:
                contact = reminder.contact
                prompt = await generate_call_prompt(reminder, contact.name)
                reminder.generated_prompt = prompt
                reminder.status = ReminderStatus.calling
                db.commit()

                await place_outbound_call(
                    phone_number=contact.phone_number,
                    prompt=prompt,
                    reminder_id=reminder.id,
                )
                logger.info(f"Call placed for reminder {reminder.id}")
            except Exception as exc:
                logger.error(f"Failed to process reminder {reminder.id}: {exc}")
                reminder.status = ReminderStatus.failed
                db.commit()
    finally:
        db.close()


def start_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
    process_due_reminders,
        "interval",
        seconds=settings.SCHEDULER_POLL_INTERVAL_SECONDS,
        id="due_reminders_poll",
    )
    scheduler.start()
    logger.info("Reminder scheduler started")
    return scheduler
