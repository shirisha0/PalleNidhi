from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.loan import LoanStatus
from app.models.receipt import Receipt
from app.models.transaction import Transaction, TransactionType
from app.services.ledger_service import compute_position


def all_transactions(db: Session):
    return db.query(Transaction).all()


def loan_transactions(db: Session, loan_id: int):
    return db.query(Transaction).filter(Transaction.loan_id == loan_id).all()


def reversed_ids(transactions) -> set:
    return {t.reverses_id for t in transactions if t.type == TransactionType.reversal}


def loan_position(db: Session, loan, as_of=None) -> dict:
    return compute_position(loan, loan_transactions(db, loan.id), as_of)


def refresh_loan_status(db: Session, loan) -> None:
    """Keep active / overdue / repaid in step with the money picture."""
    if loan.status in (LoanStatus.requested, LoanStatus.approved, LoanStatus.rejected):
        return
    pos = loan_position(db, loan)
    if pos["total_due"] <= 0:
        loan.status = LoanStatus.repaid
    elif pos["is_overdue"]:
        loan.status = LoanStatus.overdue
    else:
        loan.status = LoanStatus.active


def issue_receipt(db: Session, tx: Transaction, balance_after=None) -> Receipt:
    """Create a numbered receipt (PN-000001, PN-000002, ...). Needs tx.id, so flush first."""
    receipt = Receipt(
        receipt_no=f"TMP-{uuid4().hex[:12]}",
        transaction_id=tx.id,
        loan_balance_after=balance_after,
    )
    db.add(receipt)
    db.flush()
    receipt.receipt_no = f"PN-{receipt.id:06d}"
    return receipt


# ---------- shape database rows for the API ----------

def loan_view(db: Session, loan) -> dict:
    pos = loan_position(db, loan)
    return {
        "id": loan.id,
        "contact_id": loan.contact_id,
        "borrower_name": loan.contact.name,
        "principal": float(loan.principal),
        "monthly_rate": float(loan.monthly_rate),
        "penalty_step": float(loan.penalty_step),
        "term_months": loan.term_months,
        "purpose": loan.purpose,
        "status": loan.status.value,
        "issued_on": loan.issued_on,
        "due_on": loan.due_on,
        "approved_by": loan.approved_by,
        "principal_outstanding": float(pos["principal_outstanding"]),
        "interest_due": float(pos["interest_due"]),
        "total_due": float(pos["total_due"]),
        "current_rate": float(pos["current_rate"]),
        "days_overdue": pos["days_overdue"],
        "is_overdue": pos["is_overdue"],
    }


def tx_view(tx: Transaction, reversed_set: set) -> dict:
    return {
        "id": tx.id,
        "contact_id": tx.contact_id,
        "borrower_name": tx.contact.name,
        "loan_id": tx.loan_id,
        "type": tx.type.value,
        "amount": float(tx.amount),
        "principal_part": float(tx.principal_part or 0),
        "interest_part": float(tx.interest_part or 0),
        "occurred_on": tx.occurred_on,
        "payment_mode": tx.payment_mode,
        "recorded_by": tx.recorded_by,
        "note": tx.note,
        "reverses_id": tx.reverses_id,
        "receipt_no": tx.receipt.receipt_no if tx.receipt else None,
        "is_reversed": tx.id in reversed_set,
    }


def receipt_view(rc: Receipt) -> dict:
    tx = rc.transaction
    return {
        "receipt_no": rc.receipt_no,
        "issued_at": rc.issued_at,
        "villager": tx.contact.name,
        "type": tx.type.value,
        "amount": float(tx.amount),
        "principal_part": float(tx.principal_part or 0),
        "interest_part": float(tx.interest_part or 0),
        "loan_id": tx.loan_id,
        "loan_balance_after": (
            float(rc.loan_balance_after) if rc.loan_balance_after is not None else None
        ),
        "payment_mode": tx.payment_mode,
        "recorded_by": tx.recorded_by,
        "occurred_on": tx.occurred_on,
    }