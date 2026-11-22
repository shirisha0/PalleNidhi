export interface Loan {
  id: number;
  contact_id: number;
  borrower_name: string;
  principal: number;
  monthly_rate: number;
  penalty_step: number;
  term_months: number;
  purpose: string | null;
  status: 'requested' | 'approved' | 'active' | 'repaid' | 'overdue' | 'rejected';
  issued_on: string | null;
  due_on: string | null;
  approved_by: string | null;
  principal_outstanding: number;
  interest_due: number;
  total_due: number;
  current_rate: number;
  days_overdue: number;
  is_overdue: boolean;
}

export interface BankTransaction {
  id: number;
  contact_id: number;
  borrower_name: string;
  loan_id: number | null;
  type: 'deposit' | 'loan_given' | 'repayment' | 'reversal';
  amount: number;
  principal_part: number;
  interest_part: number;
  occurred_on: string;
  payment_mode: string;
  recorded_by: string | null;
  note: string | null;
  reverses_id: number | null;
  receipt_no: string | null;
  is_reversed: boolean;
}

export interface Receipt {
  receipt_no: string;
  issued_at: string;
  villager: string;
  type: string;
  amount: number;
  principal_part: number;
  interest_part: number;
  loan_id: number | null;
  loan_balance_after: number | null;
  payment_mode: string;
  recorded_by: string | null;
  occurred_on: string;
}

export interface FundSummary {
  fund_balance: number;
  total_deposits: number;
  total_lent_out: number;
  interest_earned: number;
  active_loans: number;
  overdue_loans: number;
  overdue_amount: number;
}

export interface FollowUp {
  reminder_id: number;
  loan_id: number;
  borrower_name: string;
  phone_number: string;
  message: string | null;
  status: string;
  called_at: string;
  reply: string | null;
  outcome: string | null;
  replied_at: string | null;
  amount_due_now: number;
}