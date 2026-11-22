from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.contact import Contact
from app.models.loan import Loan, LoanStatus
from app.models.receipt import Receipt
from app.models.transaction import Transaction, TransactionType
from app.schemas.bank import (
    DepositIn, ReceiptOut, RepaymentIn, ReverseIn, TransactionOut,
)
from app.services.bank_service import (
    all_transactions, issue_receipt, loan_position, receipt_view,
    refresh_loan_status, reversed_ids, tx_view,
)
from app.services.ledger_service import fund_balance

router = APIRouter(prefix="/transactions", tags=["Transactions"])
receipts_router = APIRouter(prefix="/receipts", tags=["Receipts"])


@router.post("/deposit", response_model=ReceiptOut, status_code=201)
def record_deposit(payload: DepositIn, db: Session = Depends(get_db)):
    if not db.get(Contact, payload.contact_id):
        raise HTTPException(status_code=404, detail="Villager not found")
    tx = Transaction(
        contact_id=payload.contact_id,
        type=TransactionType.deposit,
        amount=payload.amount,
        occurred_on=date.today(),
        payment_mode=payload.payment_mode,
        recorded_by=payload.recorded_by,
        note=payload.note,
    )
    db.add(tx)
    db.flush()
    receipt = issue_receipt(db, tx)
    db.commit()
    db.refresh(receipt)
    return receipt_view(receipt)


@router.post("/repayment", response_model=ReceiptOut, status_code=201)
def record_repayment(payload: RepaymentIn, db: Session = Depends(get_db)):
    loan = db.get(Loan, payload.loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan.status not in (LoanStatus.active, LoanStatus.overdue):
        raise HTTPException(status_code=400, detail="This loan is not active")

    before = loan_position(db, loan)
    if payload.amount > before["total_due"]:
        raise HTTPException(
            status_code=400,
            detail=f"Amount is more than the total due of {before['total_due']}",
        )

    # interest is cleared first, the rest reduces the principal
    to_interest = min(payload.amount, before["interest_due"])
    tx = Transaction(
        contact_id=loan.contact_id,
        loan_id=loan.id,
        type=TransactionType.repayment,
        amount=payload.amount,
        principal_part=payload.amount - to_interest,
        interest_part=to_interest,
        occurred_on=date.today(),
        payment_mode=payload.payment_mode,
        recorded_by=payload.recorded_by,
        note=payload.note,
    )
    db.add(tx)
    db.flush()

    after = loan_position(db, loan)
    receipt = issue_receipt(db, tx, after["total_due"])
    refresh_loan_status(db, loan)
    db.commit()
    db.refresh(receipt)
    return receipt_view(receipt)


@router.post("/{tx_id}/reverse", response_model=TransactionOut, status_code=201)
def reverse_transaction(tx_id: int, payload: ReverseIn, db: Session = Depends(get_db)):
    """Never edit or delete a ledger row. Add a reversing entry instead."""
    original = db.get(Transaction, tx_id)
    if not original:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if original.type not in (TransactionType.deposit, TransactionType.repayment):
        raise HTTPException(
            status_code=400, detail="Only deposits and repayments can be reversed"
        )
    if db.query(Transaction).filter(Transaction.reverses_id == tx_id).first():
        raise HTTPException(status_code=400, detail="Already reversed")

    reversal = Transaction(
        contact_id=original.contact_id,
        loan_id=original.loan_id,
        type=TransactionType.reversal,
        amount=original.amount,
        occurred_on=date.today(),
        payment_mode=original.payment_mode,
        recorded_by=payload.recorded_by,
        note=payload.reason,
        reverses_id=original.id,
    )
    db.add(reversal)
    db.flush()

    if fund_balance(all_transactions(db)) < 0:
        raise HTTPException(
            status_code=400, detail="Reversal would make the fund balance negative"
        )

    if original.loan_id:
        loan = db.get(Loan, original.loan_id)
        refresh_loan_status(db, loan)   # a 'repaid' loan can become active again

    db.commit()
    db.refresh(reversal)
    return tx_view(reversal, set())


@router.get("/", response_model=List[TransactionOut])
def list_transactions(
    contact_id: Optional[int] = None,
    loan_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Transaction)
    if contact_id:
        query = query.filter(Transaction.contact_id == contact_id)
    if loan_id:
        query = query.filter(Transaction.loan_id == loan_id)
    rows = query.order_by(Transaction.id.desc()).all()
    rev = reversed_ids(all_transactions(db))
    return [tx_view(t, rev) for t in rows]


# ---------------- receipts ----------------

@receipts_router.get("/", response_model=List[ReceiptOut])
def list_receipts(contact_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Receipt).join(Transaction, Receipt.transaction_id == Transaction.id)
    if contact_id:
        query = query.filter(Transaction.contact_id == contact_id)
    return [receipt_view(r) for r in query.order_by(Receipt.id.desc()).all()]


@receipts_router.get("/{receipt_no}", response_model=ReceiptOut)
def get_receipt(receipt_no: str, db: Session = Depends(get_db)):
    receipt = db.query(Receipt).filter(Receipt.receipt_no == receipt_no).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return receipt_view(receipt)