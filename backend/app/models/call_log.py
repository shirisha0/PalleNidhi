from sqlalchemy import Column, Integer, Text, String, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from app.database import Base


class CallLog(Base):
    __tablename__ = "call_logs"

    id = Column(Integer, primary_key=True, index=True)
    reminder_id = Column(Integer, ForeignKey("reminders.id"), nullable=False)
    call_provider_id = Column(String(255), nullable=True)  # external call/session id
    transcript = Column(Text, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    extracted_intent = Column(String(64), nullable=True)  # confirmed/rescheduled/voicemail/no_answer
    raw_payload = Column(Text, nullable=True)  # full webhook JSON for auditing
    created_at = Column(DateTime, server_default=func.now())

    reminder = relationship("Reminder", back_populates="call_logs")
