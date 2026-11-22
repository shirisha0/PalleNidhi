from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.contact import Contact
from app.models.loan import Loan, LoanStatus
from app.models.transaction import Transaction, TransactionType
from app.schemas.bank import ApprovalIn, DisburseIn, LoanCreate, LoanOut
from app.services.bank_service import (
    all_transactions, issue_receipt, loan_view, refresh_loan_status,
)
from app.services.ledger_service import fund_balance

router = APIRouter(prefix="/loans", tags=["Loans"])


def _get_loan(db: Session, loan_id: int) -> Loan:
    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    return loan


@router.post("/", response_model=LoanOut, status_code=201)
def request_loan(payload: LoanCreate, db: Session = Depends(get_db)):
    if not db.get(Contact, payload.contact_id):
        raise HTTPException(status_code=404, detail="Villager not found")
    loan = Loan(**payload.model_dump(), status=LoanStatus.requested)
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return loan_view(db, loan)


@router.get("/", response_model=List[LoanOut])
def list_loans(
    status: Optional[str] = None,
    contact_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    loans = db.query(Loan).order_by(Loan.id.desc()).all()
    for loan in loans:
        refresh_loan_status(db, loan)   # flips active -> overdue automatically
    db.commit()
    if status:
        loans = [l for l in loans if l.status.value == status]
    if contact_id:
        loans = [l for l in loans if l.contact_id == contact_id]
    return [loan_view(db, l) for l in loans]


@router.get("/{loan_id}", response_model=LoanOut)
def get_loan(loan_id: int, db: Session = Depends(get_db)):
    loan = _get_loan(db, loan_id)
    refresh_loan_status(db, loan)
    db.commit()
    return loan_view(db, loan)


@router.post("/{loan_id}/approve", response_model=LoanOut)
def approve_loan(loan_id: int, payload: ApprovalIn, db: Session = Depends(get_db)):
    loan = _get_loan(db, loan_id)
    if loan.status != LoanStatus.requested:
        raise HTTPException(status_code=400, detail="Only requested loans can be approved")
    loan.status = LoanStatus.approved
    loan.approved_by = payload.by
    db.commit()
    return loan_view(db, loan)


@router.post("/{loan_id}/reject", response_model=LoanOut)
def reject_loan(loan_id: int, payload: ApprovalIn, db: Session = Depends(get_db)):
    loan = _get_loan(db, loan_id)
    if loan.status != LoanStatus.requested:
        raise HTTPException(status_code=400, detail="Only requested loans can be rejected")
    loan.status = LoanStatus.rejected
    loan.approved_by = f"rejected by {payload.by}"
    db.commit()
    return loan_view(db, loan)


@router.post("/{loan_id}/disburse", response_model=LoanOut)
def disburse_loan(loan_id: int, payload: DisburseIn, db: Session = Depends(get_db)):
    """Cashier hands over the money: writes the ledger entry, starts the
    interest clock, sets the due date, and issues a receipt."""
    loan = _get_loan(db, loan_id)
    if loan.status != LoanStatus.approved:
        raise HTTPException(status_code=400, detail="Only approved loans can be disbursed")
    if fund_balance(all_transactions(db)) < loan.principal:
        raise HTTPException(status_code=400, detail="Not enough money in the fund")

    today = date.today()
    tx = Transaction(
        contact_id=loan.contact_id,
        loan_id=loan.id,
        type=TransactionType.loan_given,
        amount=loan.principal,
        occurred_on=today,
        payment_mode=payload.payment_mode,
        recorded_by=payload.recorded_by,
        note="Loan disbursed",
    )
    db.add(tx)
    db.flush()

    loan.issued_on = today
    loan.due_on = today + timedelta(days=30 * loan.term_months)  # same 30-day month as the engine
    loan.status = LoanStatus.active
    issue_receipt(db, tx, loan.principal)
    db.commit()
    return loan_view(db, loan)