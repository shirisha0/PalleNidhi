import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BankTransaction, FollowUp, FundSummary, Loan, Receipt } from '../models/bank.model';

@Injectable({ providedIn: 'root' })
export class BankService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  fundSummary(): Observable<FundSummary> {
    return this.http.get<FundSummary>(`${this.base}/fund/summary`);
  }

   listLoans(status?: string, contactId?: number): Observable<Loan[]> {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (contactId) params.set('contact_id', String(contactId));
    const qs = params.toString();
    return this.http.get<Loan[]>(`${this.base}/loans/${qs ? '?' + qs : ''}`);
  }

  requestLoan(payload: {
    contact_id: number; principal: number; monthly_rate: number;
    penalty_step: number; term_months: number; purpose?: string;
  }): Observable<Loan> {
    return this.http.post<Loan>(`${this.base}/loans/`, payload);
  }

  approveLoan(id: number, by: string): Observable<Loan> {
    return this.http.post<Loan>(`${this.base}/loans/${id}/approve`, { by });
  }

  rejectLoan(id: number, by: string): Observable<Loan> {
    return this.http.post<Loan>(`${this.base}/loans/${id}/reject`, { by });
  }

  disburseLoan(id: number, recorded_by: string, payment_mode = 'cash'): Observable<Loan> {
    return this.http.post<Loan>(`${this.base}/loans/${id}/disburse`, { recorded_by, payment_mode });
  }

  recordDeposit(payload: {
    contact_id: number; amount: number; payment_mode: string;
    recorded_by: string; note?: string;
  }): Observable<Receipt> {
    return this.http.post<Receipt>(`${this.base}/transactions/deposit`, payload);
  }

  recordRepayment(payload: {
    loan_id: number; amount: number; payment_mode: string;
    recorded_by: string; note?: string;
  }): Observable<Receipt> {
    return this.http.post<Receipt>(`${this.base}/transactions/repayment`, payload);
  }

  reverseTransaction(id: number, recorded_by: string, reason: string): Observable<BankTransaction> {
    return this.http.post<BankTransaction>(`${this.base}/transactions/${id}/reverse`, { recorded_by, reason });
  }

  listTransactions(contactId?: number, loanId?: number): Observable<BankTransaction[]> {
    const params = new URLSearchParams();
    if (contactId) params.set('contact_id', String(contactId));
    if (loanId) params.set('loan_id', String(loanId));
    const qs = params.toString();
    return this.http.get<BankTransaction[]>(`${this.base}/transactions/${qs ? '?' + qs : ''}`);
  }

  listReceipts(contactId?: number): Observable<Receipt[]> {
    const url = contactId ? `${this.base}/receipts/?contact_id=${contactId}` : `${this.base}/receipts/`;
    return this.http.get<Receipt[]>(url);
  }

  getReceipt(receiptNo: string): Observable<Receipt> {
    return this.http.get<Receipt>(`${this.base}/receipts/${receiptNo}`);
  }

  followUps(): Observable<FollowUp[]> {
    return this.http.get<FollowUp[]>(`${this.base}/loan-reminders/follow-ups`);
  }

  callNow(loanId: number): Observable<any> {
    return this.http.post(`${this.base}/loan-reminders/${loanId}/call-now`, {});
  }
}