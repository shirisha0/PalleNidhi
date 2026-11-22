"""
Loan reminder logic: decides which loans need a call today, and builds the
exact script. Amounts come from the ledger, never from an LLM.
"""

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.loan import Loan, LoanStatus
from app.models.reminder import Reminder, ReminderStatus
from app.services.bank_service import loan_position, refresh_loan_status

# India has no daylight saving, so a fixed +5:30 offset is exact.
IST = timezone(timedelta(hours=5, minutes=30))

CALL_START_HOUR = 9        # no calls before 9:00 IST
CALL_END_HOUR = 19         # or after 19:00 IST
UPCOMING_DAYS = 3          # call this many days before the due date
OVERDUE_EVERY_DAYS = 3     # then every N days once overdue


def speak_amount(amount: Decimal) -> str:
    paise_total = int((Decimal(amount) * 100).to_integral_value())
    rupees, paise = divmod(paise_total, 100)
    if paise:
        return f"{rupees} rupees and {paise} paise"
    return f"{rupees} rupees"


def build_message(loan: Loan, pos: dict, today: date) -> str:
    due = f"{loan.due_on.day} {loan.due_on:%B}"
    if pos["is_overdue"]:
        when = f"has been overdue since {due}, and interest is increasing every month"
    elif loan.due_on == today:
        when = "is due today"
    else:
        when = f"is due on {due}"
    return (
        f"Hello {loan.contact.name}. This is a reminder from Pellenidhi, your village fund. "
        f"Your loan payment of {speak_amount(pos['total_due'])} {when}. "
        "Please say yes if you will pay soon, or say reschedule if you need more time."
    )


def create_loan_reminder(db: Session, loan: Loan, pos: dict, today: date) -> Reminder:
    """Queue a call. The scheduler picks it up within a minute."""
    reminder = Reminder(
        contact_id=loan.contact_id,
        loan_id=loan.id,
        context=f"Loan #{loan.id} repayment reminder, Rs {pos['total_due']} due",
        scheduled_time=datetime.utcnow(),
        status=ReminderStatus.pending,
        generated_prompt=build_message(loan, pos, today),
    )
    db.add(reminder)
    db.flush()
    return reminder


def _today_start_utc() -> datetime:
    """Midnight today in India, expressed in UTC (how scheduled_time is stored)."""
    start_ist = datetime.now(IST).replace(hour=0, minute=0, second=0, microsecond=0)
    return start_ist.astimezone(timezone.utc).replace(tzinfo=None)


def _should_call_today(loan: Loan, pos: dict, today: date) -> bool:
    days_to_due = (loan.due_on - today).days
    if days_to_due in (UPCOMING_DAYS, 0):
        return True
    return pos["days_overdue"] > 0 and pos["days_overdue"] % OVERDUE_EVERY_DAYS == 0


def run_loan_reminder_scan(db: Session, respect_hours: bool = True) -> dict:
    now_ist = datetime.now(IST)
    if respect_hours and not (CALL_START_HOUR <= now_ist.hour < CALL_END_HOUR):
        return {"created": 0, "reminder_ids": [], "note": "Outside calling hours (9:00-19:00 IST)"}

    today = now_ist.date()
    day_start = _today_start_utc()
    created = []

    open_loans = (
        db.query(Loan)
        .filter(Loan.status.in_([LoanStatus.active, LoanStatus.overdue]))
        .all()
    )
    for loan in open_loans:
        refresh_loan_status(db, loan)
        if loan.status not in (LoanStatus.active, LoanStatus.overdue) or loan.due_on is None:
            continue
        pos = loan_position(db, loan, today)
        if pos["total_due"] <= 0 or not _should_call_today(loan, pos, today):
            continue
        already_called = (
            db.query(Reminder)
            .filter(Reminder.loan_id == loan.id, Reminder.scheduled_time >= day_start)
            .first()
        )
        if already_called:
            continue
        created.append(create_loan_reminder(db, loan, pos, today).id)

    db.commit()
    return {"created": len(created), "reminder_ids": created}