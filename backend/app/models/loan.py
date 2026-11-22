import enum

from sqlalchemy import (
    Column, Integer, String, Numeric, Date, DateTime, Enum, ForeignKey, func,
)
from sqlalchemy.orm import relationship

from app.database import Base


class LoanStatus(str, enum.Enum):
    requested = "requested"
    approved = "approved"
    active = "active"
    repaid = "repaid"
    overdue = "overdue"
    rejected = "rejected"


class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False, index=True)
    principal = Column(Numeric(12, 2), nullable=False)
    monthly_rate = Column(Numeric(5, 2), nullable=False)             # % per month
    penalty_step = Column(Numeric(5, 2), nullable=False, default=1)  # extra % per overdue 30-day block
    term_months = Column(Integer, nullable=False)
    purpose = Column(String(255), nullable=True)
    status = Column(Enum(LoanStatus), default=LoanStatus.requested, index=True)
    issued_on = Column(Date, nullable=True)   # set when the cashier hands over the money
    due_on = Column(Date, nullable=True)
    approved_by = Column(String(120), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    contact = relationship("Contact")
    transactions = relationship("Transaction", back_populates="loan")