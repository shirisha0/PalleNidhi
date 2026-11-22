import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ContactService } from '../../../core/services/contact.service';
import { BankService } from '../../../core/services/bank.service';
import { SessionService } from '../../../core/services/session.service';
import { Receipt } from '../../../core/models/bank.model';

@Component({
  selector: 'app-villager-onboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="bank">
      <h1>Add villager</h1>
      <p class="tagline">Enter their details and record their first deposit, if any.</p>

      <form [formGroup]="form" (ngSubmit)="submit()" class="card panel">
        <h2>Villager details</h2>
        <label>
          Name
          <input type="text" formControlName="name" />
        </label>
        <label>
          Phone number
          <input type="tel" formControlName="phone_number" placeholder="+91..." />
        </label>
        <label>
          Address
          <input type="text" formControlName="address" placeholder="House no., village" />
        </label>
        <label>
          Email (optional)
          <input type="email" formControlName="email" />
        </label>

        <h2>Opening deposit (optional)</h2>
        <label>
          Amount (₹) — leave blank or 0 if none yet
          <input type="number" formControlName="deposit_amount" />
        </label>
        <label>
          Payment mode
          <select formControlName="payment_mode">
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
          </select>
        </label>

        <button type="submit" class="primary" [disabled]="form.invalid || submitting">
          {{ submitting ? 'Saving...' : 'Add villager' }}
        </button>

        <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      </form>

      <div class="card receipt" *ngIf="createdReceipt">
        <h2>Deposit recorded — {{ createdReceipt.receipt_no }}</h2>
        <p class="ok">
          {{ contactName }} has been added, and a deposit of
          ₹ {{ createdReceipt.amount | number:'1.0-2' }} was recorded.
        </p>
      </div>
      <div class="card receipt" *ngIf="createdContactOnly">
        <h2>Villager added</h2>
        <p class="ok">{{ contactName }} has been added. No deposit recorded yet.</p>
      </div>
    </div>
  `,
  styleUrls: ['../bank-theme.css'],
  styles: [`
    .tagline { color: var(--bank-ink-muted); margin: 6px 0 24px; }
    .panel { padding: 22px; max-width: 480px; }
    .panel h2 { font-size: 1rem; margin: 0 0 14px; }
    .panel h2:not(:first-child) { margin-top: 10px; padding-top: 18px; border-top: 1px solid var(--bank-border); }
    .error { color: var(--bank-money-out); margin-top: 10px; }
    .receipt { padding: 20px; max-width: 480px; margin-top: 20px; }
    .ok { color: var(--bank-money-in); margin: 0; }
  `],
})
export class VillagerOnboardComponent {
  form: FormGroup;
  submitting = false;
  errorMessage = '';
  createdReceipt: Receipt | null = null;
  createdContactOnly = false;
  contactName = '';

  constructor(
    private fb: FormBuilder,
    private contactService: ContactService,
    private bank: BankService,
    private session: SessionService,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      phone_number: ['', Validators.required],
      address: [''],
      email: [''],
      deposit_amount: [null],
      payment_mode: ['cash'],
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.submitting = true;
    this.errorMessage = '';
    this.createdReceipt = null;
    this.createdContactOnly = false;

    const { name, phone_number, address, email, deposit_amount, payment_mode } = this.form.value;

    this.contactService.create({ name, phone_number, address, email }).subscribe({
      next: (contact) => {
        this.contactName = contact.name;

        if (deposit_amount && deposit_amount > 0) {
          this.bank.recordDeposit({
            contact_id: contact.id,
            amount: deposit_amount,
            payment_mode,
            recorded_by: this.session.name() || 'Cashier',
          }).subscribe({
            next: (receipt) => {
              this.createdReceipt = receipt;
              this.submitting = false;
              this.form.reset({ payment_mode: 'cash' });
            },
            error: (e) => {
              this.errorMessage = `Villager was added, but the deposit failed: ${e?.error?.detail || 'unknown error'}`;
              this.submitting = false;
            },
          });
        } else {
          this.createdContactOnly = true;
          this.submitting = false;
          this.form.reset({ payment_mode: 'cash' });
        }
      },
      error: (e) => {
        this.errorMessage = e?.error?.detail || 'Failed to add villager.';
        this.submitting = false;
      },
    });
  }
}