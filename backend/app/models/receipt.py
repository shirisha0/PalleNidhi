from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from app.database import Base


class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(Integer, primary_key=True, index=True)
    receipt_no = Column(String(20), unique=True, nullable=False)   # e.g. PN-000001
    transaction_id = Column(Integer, ForeignKey("transactions.id"), unique=True, nullable=False)
    loan_balance_after = Column(Numeric(12, 2), nullable=True)
    issued_at = Column(DateTime, server_default=func.now())

    transaction = relationship("Transaction", back_populates="receipt")