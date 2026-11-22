from datetime import date
from decimal import Decimal
from types import SimpleNamespace as NS

from app.models.transaction import TransactionType as T
from app.services.ledger_service import compute_position, fund_balance

loan = NS(
    principal=Decimal("1000"), monthly_rate=Decimal("3"), penalty_step=Decimal("1"),
    issued_on=date(2026, 1, 1), due_on=date(2026, 3, 31),
)


def check(name, got, expected):
    print(f"{'PASS' if got == expected else 'FAIL'}  {name}: got {got}, expected {expected}")


p = compute_position(loan, [], date(2026, 3, 31))
check("interest on due date", p["interest_due"], Decimal("89.00"))

p = compute_position(loan, [], date(2026, 4, 30))
check("30 days late (rate 4%)", p["interest_due"], Decimal("129.00"))

p = compute_position(loan, [], date(2026, 5, 1))
check("31 days late (rate 5% on last day)", p["interest_due"], Decimal("130.67"))

pay = NS(id=1, type=T.repayment, amount=Decimal("500"), occurred_on=date(2026, 2, 1), reverses_id=None)
p = compute_position(loan, [pay], date(2026, 3, 31))
check("principal after partial payment", p["principal_outstanding"], Decimal("531.00"))
check("interest after partial payment", p["interest_due"], Decimal("30.80"))
check("total due", p["total_due"], Decimal("561.80"))

undo = NS(id=2, type=T.reversal, amount=Decimal("500"), occurred_on=date(2026, 2, 2), reverses_id=1)
p = compute_position(loan, [pay, undo], date(2026, 3, 31))
check("reversed payment ignored", p["interest_due"], Decimal("89.00"))

txs = [
    NS(id=1, type=T.deposit, amount=Decimal("5000"), reverses_id=None),
    NS(id=2, type=T.loan_given, amount=Decimal("1000"), reverses_id=None),
    NS(id=3, type=T.repayment, amount=Decimal("300"), reverses_id=None),
]
check("fund balance", fund_balance(txs), Decimal("4300.00"))