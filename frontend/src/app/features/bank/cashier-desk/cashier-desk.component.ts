import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BankService } from '../../../core/services/bank.service';
import { SessionService } from '../../../core/services/session.service';
import { Receipt } from '../../../core/models/bank.model';

@Component({
  selector: 'app-cashier-desk',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bank">
      <h1>Cashier desk</h1>

      <div class="row">
        <div class="card panel">
          <h2>Record a deposit</h2>
          <label>Villager (contact ID)
            <input type="number" [(ngModel)]="deposit.contact_id" />
          </label>
          <label>Amount (₹)
            <input type="number" [(ngModel)]="deposit.amount" />
          </label>
          <label>Payment mode
            <select [(ngModel)]="deposit.payment_mode">
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
            </select>
          </label>
          <button class="primary" (click)="submitDeposit()">Record deposit</button>
        </div>

        <div class="card panel">
          <h2>Record a repayment</h2>
          <label>Loan ID
            <input type="number" [(ngModel)]="repayment.loan_id" />
          </label>
          <label>Amount (₹)
            <input type="number" [(ngModel)]="repayment.amount" />
          </label>
          <label>Payment mode
            <select [(ngModel)]="repayment.payment_mode">
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
            </select>
          </label>
          <button class="primary" (click)="submitRepayment()">Record repayment</button>
        </div>
      </div>

      <div class="card receipt" *ngIf="lastReceipt">
        <div class="receipt-head">
          <h2>Receipt {{ lastReceipt.receipt_no }}</h2>
          <button class="ghost" onclick="window.print()">Print</button>
        </div>
        <dl>
          <dt>Villager</dt><dd>{{ lastReceipt.villager }}</dd>
          <dt>Type</dt><dd class="cap">{{ lastReceipt.type }}</dd>
          <dt>Amount</dt><dd class="money-in">₹ {{ lastReceipt.amount | number:'1.0-2' }}</dd>
          <dt *ngIf="lastReceipt.loan_id">Principal / Interest</dt>
          <dd *ngIf="lastReceipt.loan_id">
            ₹ {{ lastReceipt.principal_part | number:'1.0-2' }} /
            ₹ {{ lastReceipt.interest_part | number:'1.0-2' }}
          </dd>
          <dt *ngIf="lastReceipt.loan_balance_after !== null">Balance after</dt>
          <dd *ngIf="lastReceipt.loan_balance_after !== null" class="money-out">
            ₹ {{ lastReceipt.loan_balance_after | number:'1.0-2' }}
          </dd>
          <dt>Cashier</dt><dd>{{ lastReceipt.recorded_by }}</dd>
          <dt>Date</dt><dd>{{ lastReceipt.occurred_on | date:'MMM d, y' }}</dd>
        </dl>
      </div>

      <p class="error" *ngIf="errorMsg">{{ errorMsg }}</p>
    </div>
  `,
  styleUrls: ['../bank-theme.css'],
  styles: [`
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .panel { padding: 22px; }
    .panel h2 { margin-bottom: 16px; font-size: 1.05rem; }
    .receipt { padding: 24px; max-width: 420px; }
    .receipt-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 14px; }
    dl { display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; margin: 0; }
    dt { color: var(--bank-ink-muted); font-size: 0.82rem; }
    dd { margin: 0; text-align: right; font-weight: 500; }
    .cap { text-transform: capitalize; }
    .error { color: var(--bank-money-out); margin-top: 12px; }
  `],
})
export class CashierDeskComponent {
  deposit = { contact_id: null as number | null, amount: null as number | null, payment_mode: 'cash' };
  repayment = { loan_id: null as number | null, amount: null as number | null, payment_mode: 'cash' };
  lastReceipt: Receipt | null = null;
  errorMsg = '';

  constructor(private bank: BankService, private session: SessionService) {}

  submitDeposit(): void {
    if (!this.deposit.contact_id || !this.deposit.amount) return;
    this.errorMsg = '';
    this.bank.recordDeposit({ ...this.deposit, contact_id: this.deposit.contact_id, amount: this.deposit.amount, recorded_by: this.session.name() || 'Cashier' } as any)
      .subscribe({
        next: (r) => (this.lastReceipt = r),
        error: (e) => (this.errorMsg = e?.error?.detail || 'Could not record deposit.'),
      });
  }

  submitRepayment(): void {
    if (!this.repayment.loan_id || !this.repayment.amount) return;
    this.errorMsg = '';
    this.bank.recordRepayment({ ...this.repayment, loan_id: this.repayment.loan_id, amount: this.repayment.amount, recorded_by: this.session.name() || 'Cashier' } as any)
      .subscribe({
        next: (r) => (this.lastReceipt = r),
        error: (e) => (this.errorMsg = e?.error?.detail || 'Could not record repayment.'),
      });
  }
}