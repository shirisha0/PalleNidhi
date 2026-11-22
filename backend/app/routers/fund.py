from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.loan import Loan, LoanStatus
from app.models.transaction import TransactionType
from app.schemas.bank import FundSummary
from app.services.bank_service import (
    all_transactions, loan_position, refresh_loan_status, reversed_ids,
)
from app.services.ledger_service import fund_balance

router = APIRouter(prefix="/fund", tags=["Fund"])


@router.get("/summary", response_model=FundSummary)
def fund_summary(db: Session = Depends(get_db)):
    txs = all_transactions(db)
    rev = reversed_ids(txs)
    live = [t for t in txs if t.type != TransactionType.reversal and t.id not in rev]

    total_deposits = sum(
        (Decimal(t.amount) for t in live if t.type == TransactionType.deposit),
        Decimal("0"),
    )
    interest_earned = sum(
        (Decimal(t.interest_part or 0) for t in live if t.type == TransactionType.repayment),
        Decimal("0"),
    )

    lent_out = Decimal("0")
    overdue_amount = Decimal("0")
    active_loans = 0
    overdue_loans = 0

    open_loans = (
        db.query(Loan)
        .filter(Loan.status.in_([LoanStatus.active, LoanStatus.overdue]))
        .all()
    )
    for loan in open_loans:
        refresh_loan_status(db, loan)
        pos = loan_position(db, loan)
        lent_out += pos["principal_outstanding"]
        if loan.status == LoanStatus.overdue:
            overdue_loans += 1
            overdue_amount += pos["total_due"]
        elif loan.status == LoanStatus.active:
            active_loans += 1
    db.commit()

    return {
        "fund_balance": float(fund_balance(txs)),
        "total_deposits": float(total_deposits),
        "total_lent_out": float(lent_out),
        "interest_earned": float(interest_earned),
        "active_loans": active_loans,
        "overdue_loans": overdue_loans,
        "overdue_amount": float(overdue_amount),
    }