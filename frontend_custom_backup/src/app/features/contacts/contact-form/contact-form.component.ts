import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ContactService } from '../../../core/services/contact.service';

@Component({
  selector: 'app-contact-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="contact-form">
      <label>
        Name
        <input type="text" formControlName="name" />
      </label>

      <label>
        Phone number
        <input type="tel" formControlName="phone_number" placeholder="+1..." />
      </label>

      <label>
        Email (optional)
        <input type="email" formControlName="email" />
      </label>

      <label>
        Timezone
        <input type="text" formControlName="timezone" placeholder="e.g. Asia/Kolkata" />
      </label>

      <button type="submit" [disabled]="form.invalid || submitting">
        {{ submitting ? 'Saving...' : 'Add Contact' }}
      </button>

      <p *ngIf="successMessage" class="success">{{ successMessage }}</p>
      <p *ngIf="errorMessage" class="error">{{ errorMessage }}</p>
    </form>
  `,
})
export class ContactFormComponent {
  form: FormGroup;
  submitting = false;
  successMessage = '';
  errorMessage = '';

  constructor(private fb: FormBuilder, private contactService: ContactService) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      phone_number: ['', Validators.required],
      email: [''],
      timezone: ['UTC'],
    });
  }

  submit(): void {
    if (this.form.invalid) return;

    this.submitting = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.contactService.create(this.form.value).subscribe({
      next: () => {
        this.successMessage = 'Contact added successfully.';
        this.form.reset({ timezone: 'UTC' });
        this.submitting = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.detail || 'Failed to add contact.';
        this.submitting = false;
      },
    });
  }
}
