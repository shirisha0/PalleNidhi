import enum

from sqlalchemy import (
    Column, Integer, String, Numeric, Date, DateTime, Enum, ForeignKey, func,
)
from sqlalchemy.orm import relationship

from app.database import Base


class TransactionType(str, enum.Enum):
    deposit = "deposit"
    loan_given = "loan_given"
    repayment = "repayment"
    reversal = "reversal"


class Transaction(Base):
    """Append-only ledger. Rows are never edited; mistakes are fixed with a
    'reversal' row that points at the original."""

    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id"), nullable=True, index=True)
    type = Column(Enum(TransactionType), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    principal_part = Column(Numeric(12, 2), default=0)   # for repayments
    interest_part = Column(Numeric(12, 2), default=0)    # for repayments
    occurred_on = Column(Date, nullable=False)
    payment_mode = Column(String(30), default="cash")
    recorded_by = Column(String(120), nullable=True)
    note = Column(String(255), nullable=True)
    reverses_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    contact = relationship("Contact")
    loan = relationship("Loan", back_populates="transactions")
    receipt = relationship("Receipt", back_populates="transaction", uselist=False)