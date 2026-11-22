import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BankService } from '../../../core/services/bank.service';
import { FundSummary, Loan } from '../../../core/models/bank.model';

@Component({
  selector: 'app-fund-overview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="bank">
      <h1>Pellenidhi — village fund</h1>
      <p class="tagline">Every rupee in, every rupee out, one ledger.</p>

      <div class="grid" *ngIf="summary">
        <div class="card stat">
          <span class="label">Fund balance</span>
          <span class="value money-in">₹ {{ summary.fund_balance | number:'1.0-2' }}</span>
        </div>
        <div class="card stat">
          <span class="label">Lent out</span>
          <span class="value">₹ {{ summary.total_lent_out | number:'1.0-2' }}</span>
        </div>
        <div class="card stat">
          <span class="label">Interest earned</span>
          <span class="value money-in">₹ {{ summary.interest_earned | number:'1.0-2' }}</span>
        </div>
        <div class="card stat" [class.alert]="summary.overdue_loans > 0">
          <span class="label">Overdue loans</span>
          <span class="value" [class.money-out]="summary.overdue_loans > 0">
            {{ summary.overdue_loans }} (₹ {{ summary.overdue_amount | number:'1.0-2' }})
          </span>
        </div>
      </div>

      <div class="card section">
        <div class="section-head">
          <h2>Needs attention today</h2>
          <a routerLink="/bank/loans" class="ghost-link">View all loans →</a>
        </div>

        <table *ngIf="attention.length > 0">
          <thead>
            <tr><th>Villager</th><th>Total due</th><th>Due date</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let l of attention">
              <td>{{ l.borrower_name }}</td>
              <td class="money-out">₹ {{ l.total_due | number:'1.0-2' }}</td>
              <td>{{ l.due_on | date:'MMM d' }}</td>
              <td><span class="badge" [ngClass]="'status-' + l.status">{{ l.status }}</span></td>
            </tr>
          </tbody>
        </table>
        <div *ngIf="attention.length === 0" class="empty">Nothing overdue right now.</div>
      </div>
    </div>
  `,
  styleUrls: ['../bank-theme.css'],
  styles: [`
    .tagline { color: var(--bank-ink-muted); margin: 6px 0 28px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
    .stat { padding: 20px; display: flex; flex-direction: column; gap: 6px; }
    .stat.alert { border-color: var(--bank-money-out); }
    .label { font-size: 0.8rem; color: var(--bank-ink-muted); }
    .value { font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem; font-weight: 600; }
    .section { padding: 22px; }
    .section-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 14px; }
    .ghost-link { font-size: 0.85rem; color: var(--bank-ink-muted); }
    .empty { color: var(--bank-ink-muted); padding: 20px; text-align: center; }
  `],
})
export class FundOverviewComponent implements OnInit {
  summary: FundSummary | null = null;
  attention: Loan[] = [];

  constructor(private bank: BankService) {}

  ngOnInit(): void {
    this.bank.fundSummary().subscribe((s) => (this.summary = s));
    this.bank.listLoans().subscribe((loans) => {
      this.attention = loans.filter((l) => l.status === 'overdue' || l.status === 'active')
        .filter((l) => l.total_due > 0)
        .sort((a, b) => b.days_overdue - a.days_overdue)
        .slice(0, 8);
    });
  }
}