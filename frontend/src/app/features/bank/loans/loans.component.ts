import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BankService } from '../../../core/services/bank.service';
import { SessionService } from '../../../core/services/session.service';
import { Loan } from '../../../core/models/bank.model';

type Tab = 'requested' | 'approved' | 'active' | 'overdue' | 'repaid' | 'rejected';

@Component({
  selector: 'app-loans',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bank">
      <div class="head-row">
        <h1>Loans</h1>
        <button class="primary" (click)="showNewLoan = !showNewLoan">
          {{ showNewLoan ? 'Close' : '+ New loan request' }}
        </button>
      </div>

      <div class="card new-loan" *ngIf="showNewLoan">
        <h2>Request a loan</h2>
        <div class="form-grid">
          <label>Villager (contact ID)
            <input type="number" [(ngModel)]="form.contact_id" />
          </label>
          <label>Amount (₹)
            <input type="number" [(ngModel)]="form.principal" />
          </label>
          <label>Monthly interest (%)
            <input type="number" step="0.1" [(ngModel)]="form.monthly_rate" />
          </label>
          <label>Penalty step (% added per month late)
            <input type="number" step="0.1" [(ngModel)]="form.penalty_step" />
          </label>
          <label>Term (months)
            <input type="number" [(ngModel)]="form.term_months" />
          </label>
          <label>Purpose
            <input type="text" [(ngModel)]="form.purpose" />
          </label>
        </div>
        <button class="primary" (click)="submitLoan()">Submit request</button>
        <p class="ok" *ngIf="message">{{ message }}</p>
      </div>

      <div class="tabs">
        <button *ngFor="let t of tabs" [class.active]="tab === t" (click)="setTab(t)">
          {{ t }}
        </button>
      </div>

      <div class="card">
        <table *ngIf="loans.length > 0">
          <thead>
            <tr>
              <th>Villager</th><th>Principal</th><th>Total due</th>
              <th>Rate</th><th>Due date</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let l of loans">
              <td>{{ l.borrower_name }}</td>
              <td>₹ {{ l.principal | number:'1.0-2' }}</td>
              <td [class.money-out]="l.total_due > 0 && l.is_overdue"
                  [class.money-in]="l.total_due === 0">
                ₹ {{ l.total_due | number:'1.0-2' }}
              </td>
              <td>{{ l.current_rate }}%<span *ngIf="l.is_overdue" class="penalty"> (penalty)</span></td>
              <td>{{ l.due_on ? (l.due_on | date:'MMM d') : '—' }}</td>
              <td><span class="badge" [ngClass]="'status-' + l.status">{{ l.status }}</span></td>
              <td class="actions">
                <ng-container *ngIf="l.status === 'requested' && canApprove">
                  <button class="primary small" (click)="approve(l)">Approve</button>
                  <button class="danger small" (click)="reject(l)">Reject</button>
                </ng-container>
                <button class="ghost small" *ngIf="l.status === 'approved'" (click)="disburse(l)">
                  Hand over money
                </button>
                <button class="ghost small" *ngIf="l.status === 'overdue' || l.status === 'active'"
                        (click)="callNow(l)">
                  Call now
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div *ngIf="loans.length === 0" class="empty">No loans in this list.</div>
      </div>
    </div>
  `,
  styleUrls: ['../bank-theme.css'],
  styles: [`
    .head-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 20px; }
    .new-loan { padding: 20px; margin-bottom: 20px; }
    .form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0 16px; }
    .ok { color: var(--bank-money-in); margin-top: 10px; }
    .tabs { display: flex; gap: 6px; margin-bottom: 14px; }
    .tabs button {
      background: transparent; border: 1px solid var(--bank-border);
      padding: 7px 14px; border-radius: 999px; cursor: pointer;
      text-transform: capitalize; font-size: 0.85rem; color: var(--bank-ink-muted);
    }
    .tabs button.active { background: var(--bank-ink); color: #fff; border-color: var(--bank-ink); }
    .penalty { color: var(--bank-money-out); font-size: 0.78rem; }
    .actions { display: flex; gap: 6px; }
    button.small { padding: 6px 10px; font-size: 0.8rem; }
    .empty { color: var(--bank-ink-muted); padding: 24px; text-align: center; }
  `],
})
export class LoansComponent implements OnInit {
  tabs: Tab[] = ['requested', 'approved', 'active', 'overdue', 'repaid', 'rejected'];
  tab: Tab = 'requested';
  loans: Loan[] = [];
  showNewLoan = false;
  message = '';

  form = {
    contact_id: null as number | null,
    principal: null as number | null,
    monthly_rate: 2,
    penalty_step: 1,
    term_months: 3,
    purpose: '',
  };

  get canApprove(): boolean {
    return this.session.canApprove();
  }

  constructor(private bank: BankService, private session: SessionService) {}

  ngOnInit(): void {
    this.setTab('requested');
  }

  setTab(t: Tab): void {
    this.tab = t;
    this.bank.listLoans(t).subscribe((loans) => (this.loans = loans));
  }

  submitLoan(): void {
    if (!this.form.contact_id || !this.form.principal) return;
    this.bank.requestLoan(this.form as any).subscribe({
      next: () => {
        this.message = 'Loan request submitted.';
        this.showNewLoan = false;
        this.setTab('requested');
      },
      error: (e) => (this.message = e?.error?.detail || 'Failed to submit.'),
    });
  }

  approve(l: Loan): void {
    this.bank.approveLoan(l.id, this.session.name() || 'Head').subscribe(() => this.setTab(this.tab));
  }

  reject(l: Loan): void {
    this.bank.rejectLoan(l.id, this.session.name() || 'Head').subscribe(() => this.setTab(this.tab));
  }

  disburse(l: Loan): void {
    this.bank.disburseLoan(l.id, this.session.name() || 'Cashier').subscribe(() => this.setTab(this.tab));
  }

  callNow(l: Loan): void {
    this.bank.callNow(l.id).subscribe({
      next: () => alert(`Calling ${l.borrower_name} now.`),
      error: (e) => alert(e?.error?.detail || 'Could not place the call.'),
    });
  }
}