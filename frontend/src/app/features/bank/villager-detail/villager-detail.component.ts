import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ContactService } from '../../../core/services/contact.service';
import { BankService } from '../../../core/services/bank.service';
import { Contact } from '../../../core/models/contact.model';
import { BankTransaction, Loan } from '../../../core/models/bank.model';

@Component({
  selector: 'app-villager-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="bank" *ngIf="contact">
      <a routerLink="/contacts" class="back-link">← All villagers</a>

      <div class="card profile">
        <h1>{{ contact.name }}</h1>
        <dl>
          <dt>Phone</dt><dd>{{ contact.phone_number }}</dd>
          <dt>Address</dt><dd>{{ contact.address || '—' }}</dd>
          <dt>Email</dt><dd>{{ contact.email || '—' }}</dd>
        </dl>
      </div>

      <div class="card section">
        <h2>Loans</h2>
        <table *ngIf="loans.length > 0">
          <thead>
            <tr><th>Principal</th><th>Total due</th><th>Due date</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let l of loans">
              <td>₹ {{ l.principal | number:'1.0-2' }}</td>
              <td [class.money-out]="l.total_due > 0 && l.is_overdue"
                  [class.money-in]="l.total_due === 0">
                ₹ {{ l.total_due | number:'1.0-2' }}
              </td>
              <td>{{ l.due_on ? (l.due_on | date:'MMM d, y') : '—' }}</td>
              <td><span class="badge" [ngClass]="'status-' + l.status">{{ l.status }}</span></td>
            </tr>
          </tbody>
        </table>
        <div *ngIf="loans.length === 0" class="empty">No loans yet.</div>
      </div>

      <div class="card section">
        <h2>Transaction history</h2>
        <table *ngIf="transactions.length > 0">
          <thead>
            <tr><th>Date</th><th>Type</th><th>Amount</th><th>Receipt</th><th></th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let t of transactions" [class.reversed-row]="t.is_reversed">
              <td>{{ t.occurred_on | date:'MMM d, y' }}</td>
              <td class="cap">{{ t.type }}</td>
              <td [class.money-in]="t.type === 'deposit' || t.type === 'repayment'"
                  [class.money-out]="t.type === 'loan_given'">
                ₹ {{ t.amount | number:'1.0-2' }}
              </td>
              <td>{{ t.receipt_no || '—' }}</td>
              <td *ngIf="t.is_reversed" class="reversed-tag">reversed</td>
              <td *ngIf="!t.is_reversed"></td>
            </tr>
          </tbody>
        </table>
        <div *ngIf="transactions.length === 0" class="empty">No transactions yet.</div>
      </div>
    </div>
  `,
  styleUrls: ['../bank-theme.css'],
  styles: [`
    .back-link { display: inline-block; margin-bottom: 16px; color: var(--bank-ink-muted); font-size: 0.85rem; }
    .profile { padding: 22px; margin-bottom: 20px; }
    .profile h1 { margin-bottom: 14px; }
    dl { display: grid; grid-template-columns: auto 1fr; gap: 6px 16px; margin: 0; max-width: 420px; }
    dt { color: var(--bank-ink-muted); font-size: 0.82rem; }
    dd { margin: 0; }
    .section { padding: 20px; margin-bottom: 20px; }
    .section h2 { font-size: 1.05rem; margin-bottom: 14px; }
    .cap { text-transform: capitalize; }
    .reversed-row { opacity: 0.55; text-decoration: line-through; }
    .reversed-tag { color: var(--bank-money-out); font-size: 0.78rem; }
    .empty { color: var(--bank-ink-muted); padding: 20px; text-align: center; }
  `],
})
export class VillagerDetailComponent implements OnInit {
  contact: Contact | null = null;
  loans: Loan[] = [];
  transactions: BankTransaction[] = [];

  constructor(
    private route: ActivatedRoute,
    private contactService: ContactService,
    private bank: BankService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) return;

    forkJoin({
      contact: this.contactService.get(id),
      loans: this.bank.listLoans(undefined, id),
      transactions: this.bank.listTransactions(id),
    }).subscribe(({ contact, loans, transactions }) => {
      this.contact = contact;
      this.loans = loans;
      this.transactions = transactions;
    });
  }
}