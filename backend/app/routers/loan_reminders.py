from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.call_log import CallLog
from app.models.loan import Loan, LoanStatus
from app.models.reminder import Reminder, ReminderStatus
from app.services.bank_service import loan_position, refresh_loan_status
from app.services.loan_reminders import (
    IST, create_loan_reminder, run_loan_reminder_scan,
)

router = APIRouter(prefix="/loan-reminders", tags=["Loan Reminders"])


class FollowUpOut(BaseModel):
    reminder_id: int
    loan_id: int
    borrower_name: str
    phone_number: str
    message: Optional[str] = None
    status: str
    called_at: datetime
    reply: Optional[str] = None
    outcome: Optional[str] = None
    replied_at: Optional[datetime] = None
    amount_due_now: float


@router.get("/follow-ups", response_model=List[FollowUpOut])
def follow_ups(limit: int = 50, db: Session = Depends(get_db)):
    """Every loan reminder call, newest first, with what the villager said."""
    reminders = (
        db.query(Reminder)
        .filter(Reminder.loan_id.isnot(None))
        .order_by(Reminder.id.desc())
        .limit(limit)
        .all()
    )
    result = []
    for r in reminders:
        log = (
            db.query(CallLog)
            .filter(CallLog.reminder_id == r.id)
            .order_by(CallLog.id.desc())
            .first()
        )
        loan = db.get(Loan, r.loan_id)
        pos = loan_position(db, loan)
        result.append({
            "reminder_id": r.id,
            "loan_id": r.loan_id,
            "borrower_name": r.contact.name,
            "phone_number": r.contact.phone_number,
            "message": r.generated_prompt,
            "status": r.status.value,
            "called_at": r.scheduled_time,
            "reply": log.transcript if log else None,
            "outcome": log.extracted_intent if log else None,
            "replied_at": log.created_at if log else None,
            "amount_due_now": float(pos["total_due"]),
        })
    return result


@router.post("/{loan_id}/call-now", status_code=201)
def call_now(loan_id: int, db: Session = Depends(get_db)):
    """Cashier or Head triggers a reminder call for one loan right now."""
    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    refresh_loan_status(db, loan)
    if loan.status not in (LoanStatus.active, LoanStatus.overdue):
        raise HTTPException(status_code=400, detail="This loan has no payment due")

    recent = (
        db.query(Reminder)
        .filter(
            Reminder.loan_id == loan.id,
            Reminder.status.in_([ReminderStatus.pending, ReminderStatus.calling]),
            Reminder.scheduled_time >= datetime.utcnow() - timedelta(minutes=30),
        )
        .first()
    )
    if recent:
        raise HTTPException(status_code=409, detail="A call for this loan is already in progress")

    today = datetime.now(IST).date()
    pos = loan_position(db, loan, today)
    reminder = create_loan_reminder(db, loan, pos, today)
    db.commit()
    return {
        "reminder_id": reminder.id,
        "message": reminder.generated_prompt,
        "note": "The call goes out within a minute.",
    }


@router.post("/scan")
def scan_now(respect_hours: bool = True, db: Session = Depends(get_db)):
    """Run the hourly due-date scan on demand (same logic as the scheduled job)."""
    return run_loan_reminder_scan(db, respect_hours=respect_hours)