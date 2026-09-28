from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship

from app.database import Base


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    phone_number = Column(String(20), nullable=False, index=True)
    email = Column(String(255), nullable=True)
    timezone = Column(String(64), default="UTC")
    created_at = Column(DateTime, server_default=func.now())

    reminders = relationship("Reminder", back_populates="contact", cascade="all, delete-orphan")
