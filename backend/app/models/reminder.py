import enum

from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import relationship

from app.database import Base


class ReminderStatus(str, enum.Enum):
    pending = "pending"
    calling = "calling"
    confirmed = "confirmed"
    rescheduled = "rescheduled"
    completed = "completed"
    failed = "failed"


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    context = Column(Text, nullable=False)  # raw task/reminder description
    scheduled_time = Column(DateTime, nullable=False, index=True)
    status = Column(Enum(ReminderStatus), default=ReminderStatus.pending, index=True)
    generated_prompt = Column(Text, nullable=True)  # GenAI-generated call prompt
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    contact = relationship("Contact", back_populates="reminders")
    call_logs = relationship("CallLog", back_populates="reminder", cascade="all, delete-orphan")
