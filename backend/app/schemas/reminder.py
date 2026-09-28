from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.reminder import ReminderStatus


class ReminderBase(BaseModel):
    contact_id: int
    context: str
    scheduled_time: datetime


class ReminderCreate(ReminderBase):
    pass


class ReminderUpdate(BaseModel):
    context: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    status: Optional[ReminderStatus] = None


class ReminderOut(ReminderBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: ReminderStatus
    generated_prompt: Optional[str] = None
    created_at: datetime
    updated_at: datetime
