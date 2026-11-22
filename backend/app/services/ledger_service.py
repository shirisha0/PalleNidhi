"""
Money logic for the village bank.

Rules (change them here in one place):
- Simple interest, charged monthly on the OUTSTANDING principal, accrued daily
  (a month = 30 days).
- After the due date, the monthly rate goes up by `penalty_step` for every
  started 30-day block of lateness.
- A repayment first clears accrued interest, and the rest reduces principal.
- Reversed repayments are ignored, as if they never happened.
"""

from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from math import ceil

from app.models.transaction import TransactionType

TWO_PLACES = Decimal("0.01")


def _q(value: Decimal) -> Decimal:
    return value.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def _reversed_ids(transactions) -> set:
    return {t.reverses_id for t in transactions if t.type == TransactionType.reversal}


def rate_on(loan, day: date) -> Decimal:
    """Monthly interest rate (in %) that applies on a given day."""
    base = Decimal(loan.monthly_rate)
    if loan.due_on is None or day <= loan.due_on:
        return base
    overdue_days = (day - loan.due_on).days
    return base + Decimal(loan.penalty_step) * ceil(overdue_days / 30)


def _accrue(loan, principal: Decimal, start: date, end: date) -> Decimal:
    """Interest earned on `principal` for each day after `start` up to `end`."""
    total = Decimal("0")
    if principal <= 0:
        return total
    day = start
    while day < end:
        day += timedelta(days=1)
        total += principal * (rate_on(loan, day) / Decimal(100)) / Decimal(30)
    return total


def compute_position(loan, transactions, as_of: date = None) -> dict:
    """What does this borrower owe on `as_of`?"""
    as_of = as_of or date.today()
    principal = Decimal(loan.principal)

    if loan.issued_on is None:  # money not handed over yet
        return {
            "principal_outstanding": _q(principal),
            "interest_due": Decimal("0.00"),
            "total_due": _q(principal),
            "current_rate": Decimal(loan.monthly_rate),
            "days_overdue": 0,
            "is_overdue": False,
        }

    reversed_ids = _reversed_ids(transactions)
    repayments = sorted(
        (t for t in transactions
         if t.type == TransactionType.repayment and t.id not in reversed_ids),
        key=lambda t: (t.occurred_on, t.id),
    )

    interest_owed = Decimal("0")
    cursor = loan.issued_on

    for pay in repayments:
        if pay.occurred_on > as_of:
            break
        interest_owed += _accrue(loan, principal, cursor, pay.occurred_on)
        interest_owed = _q(interest_owed)
        cursor = pay.occurred_on
        amount = Decimal(pay.amount)
        to_interest = min(amount, interest_owed)
        interest_owed -= to_interest
        principal = max(principal - (amount - to_interest), Decimal("0"))

    interest_owed += _accrue(loan, principal, cursor, as_of)

    days_overdue = 0
    if loan.due_on is not None and as_of > loan.due_on:
        days_overdue = (as_of - loan.due_on).days

    principal_out = _q(principal)
    interest_due = _q(interest_owed)
    total_due = principal_out + interest_due

    return {
        "principal_outstanding": principal_out,
        "interest_due": interest_due,
        "total_due": total_due,
        "current_rate": rate_on(loan, as_of),
        "days_overdue": days_overdue,
        "is_overdue": days_overdue > 0 and total_due > 0,
    }


def fund_balance(transactions) -> Decimal:
    """Money currently in the fund: deposits + repayments - loans given out."""
    reversed_ids = _reversed_ids(transactions)
    total = Decimal("0")
    for t in transactions:
        if t.type == TransactionType.reversal or t.id in reversed_ids:
            continue
        if t.type in (TransactionType.deposit, TransactionType.repayment):
            total += Decimal(t.amount)
        elif t.type == TransactionType.loan_given:
            total -= Decimal(t.amount)
    return _q(total)