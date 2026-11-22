from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


# ---------- inputs ----------

class LoanCreate(BaseModel):
    contact_id: int
    principal: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    monthly_rate: Decimal = Field(ge=0, le=100)
    penalty_step: Decimal = Field(default=Decimal("1"), ge=0, le=100)
    term_months: int = Field(gt=0, le=120)
    purpose: Optional[str] = None


class ApprovalIn(BaseModel):
    by: str = Field(min_length=1)


class DisburseIn(BaseModel):
    recorded_by: str = Field(min_length=1)
    payment_mode: str = "cash"


class DepositIn(BaseModel):
    contact_id: int
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    payment_mode: str = "cash"
    recorded_by: str = Field(min_length=1)
    note: Optional[str] = None


class RepaymentIn(BaseModel):
    loan_id: int
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    payment_mode: str = "cash"
    recorded_by: str = Field(min_length=1)
    note: Optional[str] = None


class ReverseIn(BaseModel):
    recorded_by: str = Field(min_length=1)
    reason: str = Field(min_length=1)


# ---------- outputs ----------

class LoanOut(BaseModel):
    id: int
    contact_id: int
    borrower_name: str
    principal: float
    monthly_rate: float
    penalty_step: float
    term_months: int
    purpose: Optional[str] = None
    status: str
    issued_on: Optional[date] = None
    due_on: Optional[date] = None
    approved_by: Optional[str] = None
    principal_outstanding: float
    interest_due: float
    total_due: float
    current_rate: float
    days_overdue: int
    is_overdue: bool


class TransactionOut(BaseModel):
    id: int
    contact_id: int
    borrower_name: str
    loan_id: Optional[int] = None
    type: str
    amount: float
    principal_part: float
    interest_part: float
    occurred_on: date
    payment_mode: str
    recorded_by: Optional[str] = None
    note: Optional[str] = None
    reverses_id: Optional[int] = None
    receipt_no: Optional[str] = None
    is_reversed: bool


class ReceiptOut(BaseModel):
    receipt_no: str
    issued_at: Optional[datetime] = None
    villager: str
    type: str
    amount: float
    principal_part: float
    interest_part: float
    loan_id: Optional[int] = None
    loan_balance_after: Optional[float] = None
    payment_mode: str
    recorded_by: Optional[str] = None
    occurred_on: date


class FundSummary(BaseModel):
    fund_balance: float
    total_deposits: float
    total_lent_out: float
    interest_earned: float
    active_loans: int
    overdue_loans: int
    overdue_amount: float