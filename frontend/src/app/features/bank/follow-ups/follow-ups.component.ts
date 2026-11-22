import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BankService } from '../../../core/services/bank.service';
import { FollowUp } from '../../../core/models/bank.model';

@Component({
  selector: 'app-follow-ups',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bank">
      <h1>Collection calls</h1>
      <p class="tagline">Every automatic call, and what the villager said.</p>

      <div class="card">
        <table *ngIf="rows.length > 0">
          <thead>
            <tr><th>Villager</th><th>Called</th><th>Reply</th><th>Outcome</th><th>Amount due now</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of rows">
              <td>{{ r.borrower_name }}</td>
              <td>{{ r.called_at | date:'MMM d, h:mm a' }}</td>
              <td class="reply">{{ r.reply ? '“' + r.reply + '”' : '—' }}</td>
              <td>
                <span class="badge" [ngClass]="'status-' + (r.outcome || r.status)">
                  {{ r.outcome || r.status }}
                </span>
              </td>
              <td [class.money-out]="r.amount_due_now > 0">₹ {{ r.amount_due_now | number:'1.0-2' }}</td>
            </tr>
          </tbody>
        </table>
        <div *ngIf="rows.length === 0" class="empty">No calls yet.</div>
      </div>
    </div>
  `,
  styleUrls: ['../bank-theme.css'],
  styles: [`
    .tagline { color: var(--bank-ink-muted); margin: 6px 0 24px; }
    .reply { max-width: 280px; font-style: italic; color: var(--bank-ink-muted); }
    .empty { color: var(--bank-ink-muted); padding: 24px; text-align: center; }
  `],
})
export class FollowUpsComponent implements OnInit {
  rows: FollowUp[] = [];

  constructor(private bank: BankService) {}

  ngOnInit(): void {
    this.bank.followUps().subscribe((r) => (this.rows = r));
  }
}