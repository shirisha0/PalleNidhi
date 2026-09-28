import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReminderService } from '../../../core/services/reminder.service';

@Component({
  selector: 'app-reminder-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="reminder-form">
      <label>
        Contact ID
        <input type="number" formControlName="contact_id" />
      </label>

      <label>
        Reminder context
        <textarea
          formControlName="context"
          placeholder="e.g. Compliance audit documentation is due at 5 PM"
        ></textarea>
      </label>

      <label>
        Scheduled time
        <input type="datetime-local" formControlName="scheduled_time" />
      </label>

      <button type="submit" [disabled]="form.invalid || submitting">
        {{ submitting ? 'Saving...' : 'Create Reminder' }}
      </button>

      <p *ngIf="successMessage" class="success">{{ successMessage }}</p>
      <p *ngIf="errorMessage" class="error">{{ errorMessage }}</p>
    </form>
  `,
})
export class ReminderFormComponent {
  form: FormGroup;
  submitting = false;
  successMessage = '';
  errorMessage = '';

  constructor(private fb: FormBuilder, private reminderService: ReminderService) {
    this.form = this.fb.group({
      contact_id: [null, Validators.required],
      context: ['', Validators.required],
      scheduled_time: ['', Validators.required],
    });
  }

  submit(): void {
    if (this.form.invalid) return;

    this.submitting = true;
    this.successMessage = '';
    this.errorMessage = '';

    const raw = this.form.value;
    const payload = {
      contact_id: raw.contact_id,
      context: raw.context,
      scheduled_time: new Date(raw.scheduled_time).toISOString(),
    };

    this.reminderService.create(payload).subscribe({
      next: () => {
        this.successMessage = 'Reminder created successfully.';
        this.form.reset();
        this.submitting = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.detail || 'Failed to create reminder.';
        this.submitting = false;
      },
    });
  }
}
