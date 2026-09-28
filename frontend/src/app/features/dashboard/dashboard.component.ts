import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, interval, startWith, switchMap } from 'rxjs';
import { ReminderService } from '../../core/services/reminder.service';
import { Reminder } from '../../core/models/reminder.model';

interface CallLog {
  id: number;
  reminder_id: number;
  transcript?: string | null;
  extracted_intent?: string | null;
  duration_seconds?: number | null;
  created_at: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="hero">
      <h1>Reminders don't get lost<br />when a real voice delivers them.</h1>
      <p>
        Ringback calls the people on your list at the time you set, reads them
        their reminder in a natural voice, and listens for what they say back —
        confirmed, rescheduled, or no answer — then logs it here automatically.
      </p>
    </section>

    <section class="stats">
      <div class="stat">
        <span class="stat-value">{{ reminders.length }}</span>
        <span class="stat-label">Total reminders</span>
      </div>
      <div class="stat">
        <span class="stat-value" [style.color]="'var(--accent-pending)'">{{ waitingCount }}</span>
        <span class="stat-label">Waiting to call</span>
      </div>
      <div class="stat">
        <span class="stat-value" [style.color]="'var(--accent-confirmed)'">{{ confirmedCount }}</span>
        <span class="stat-label">Confirmed</span>
      </div>
      <div class="stat">
        <span class="stat-value" [style.color]="'var(--accent-rescheduled)'">{{ rescheduledCount }}</span>
        <span class="stat-label">Rescheduled</span>
      </div>
      <div class="stat">
        <span class="stat-value" [style.color]="'var(--accent-failed)'">{{ failedCount }}</span>
        <span class="stat-label">Failed</span>
      </div>
    </section>

    <section class="log">
      <div class="log-head">
        <h2>Call log</h2>
        <span class="hint">Click a row to see the conversation</span>
      </div>

      <div *ngIf="reminders.length === 0" class="empty">
        No reminders yet. Add a contact, then schedule your first reminder call.
      </div>

      <table *ngIf="reminders.length > 0">
        <thead>
          <tr>
            <th></th>
            <th>Reminder</th>
            <th>Scheduled for</th>
            <th>Outcome</th>
          </tr>
        </thead>
        <tbody>
          <ng-container *ngFor="let r of reminders">
            <tr class="row" (click)="toggle(r)" [class.open]="expandedId === r.id">
              <td><span class="dot" [style.background]="statusColor(r.status)"></span></td>
              <td>{{ r.context }}</td>
              <td>{{ r.scheduled_time | date: 'MMM d, h:mm a' }}</td>
              <td class="status-label" [style.color]="statusColor(r.status)">{{ r.status }}</td>
            </tr>

            <tr *ngIf="expandedId === r.id" class="detail-row">
              <td colspan="4">
                <div class="convo">
                  <div class="bubble agent">
                    <span class="who">Agent said</span>
                    <p>{{ r.generated_prompt || 'Not generated yet. The message is created when the call is placed.' }}</p>
                  </div>

                  <div *ngIf="!logs[r.id] || logs[r.id].length === 0" class="bubble none">
                    <span class="who">Their reply</span>
                    <p>No reply recorded yet.</p>
                  </div>

                  <div *ngFor="let l of logs[r.id]" class="bubble person">
                    <span class="who">
                      Their reply
                      <span class="intent" [style.color]="statusColor(intentToStatus(l.extracted_intent))">
                        {{ l.extracted_intent || 'unknown' }}
                      </span>
                    </span>
                    <p>{{ l.transcript ? '“' + l.transcript + '”' : '(no speech detected)' }}</p>
                    <span class="when">{{ l.created_at | date: 'MMM d, h:mm a' }}</span>
                  </div>
                </div>
              </td>
            </tr>
          </ng-container>
        </tbody>
      </table>
    </section>
  `,
  styles: [`
    .hero {
      padding: 8px 0 40px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 32px;
    }
    .hero h1 {
      font-size: 2.1rem;
      line-height: 1.2;
      letter-spacing: -0.01em;
      margin-bottom: 16px;
      max-width: 20ch;
    }
    .hero p {
      color: var(--text-muted);
      max-width: 62ch;
      font-size: 1.02rem;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 1px;
      background: var(--border);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      margin-bottom: 40px;
    }
    .stat {
      background: var(--surface);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .stat-value {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.8rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .stat-label {
      color: var(--text-muted);
      font-size: 0.82rem;
    }
    .log-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .log-head h2 { font-size: 1.1rem; }
    .hint { color: var(--text-muted); font-size: 0.82rem; }
    .empty {
      color: var(--text-muted);
      padding: 32px;
      text-align: center;
      border: 1px dashed var(--border);
      border-radius: var(--radius);
    }
    .row { cursor: pointer; }
    .row:hover td, .row.open td { background: var(--surface); }
    .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .status-label {
      font-weight: 500;
      text-transform: capitalize;
    }
    .detail-row td {
      background: var(--surface);
      padding: 18px 20px 22px;
    }
    .convo {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 640px;
    }
    .bubble {
      padding: 12px 16px;
      border-radius: var(--radius);
      border: 1px solid var(--border);
    }
    .bubble p { margin: 4px 0 0; line-height: 1.45; }
    .bubble.agent {
      background: var(--surface-raised);
      border-left: 3px solid var(--accent-ring);
    }
    .bubble.person {
      background: var(--bg);
      border-left: 3px solid var(--accent-confirmed);
    }
    .bubble.none {
      background: var(--bg);
      color: var(--text-muted);
    }
    .who {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .intent { text-transform: capitalize; letter-spacing: 0; }
    .when { display: block; margin-top: 6px; font-size: 0.75rem; color: var(--text-muted); }
  `],
})
export class DashboardComponent implements OnInit, OnDestroy {
  reminders: Reminder[] = [];
  expandedId: number | null = null;
  logs: Record<number, CallLog[]> = {};
  private sub?: Subscription;

  constructor(private reminderService: ReminderService) {}

  ngOnInit(): void {
    this.sub = interval(10000)
      .pipe(
        startWith(0),
        switchMap(() => this.reminderService.list())
      )
      .subscribe((data) => {
        this.reminders = data;
        // keep the open conversation fresh while a call is in progress
        if (this.expandedId !== null) {
          this.loadLogs(this.expandedId);
        }
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  toggle(r: Reminder): void {
    if (this.expandedId === r.id) {
      this.expandedId = null;
      return;
    }
    this.expandedId = r.id;
    this.loadLogs(r.id);
  }

  private loadLogs(id: number): void {
    this.reminderService.getCallLogs(id).subscribe((data) => (this.logs[id] = data));
  }

  get waitingCount(): number {
    return this.reminders.filter((r) => r.status === 'pending' || r.status === 'calling').length;
  }

  get confirmedCount(): number {
    return this.reminders.filter((r) => r.status === 'confirmed' || r.status === 'completed').length;
  }

  get rescheduledCount(): number {
    return this.reminders.filter((r) => r.status === 'rescheduled').length;
  }

  get failedCount(): number {
    return this.reminders.filter((r) => r.status === 'failed').length;
  }

  intentToStatus(intent?: string | null): string {
    switch (intent) {
      case 'confirmed': return 'confirmed';
      case 'rescheduled': return 'rescheduled';
      case 'no_answer':
      case 'voicemail': return 'failed';
      default: return 'pending';
    }
  }

  statusColor(status: string): string {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return 'var(--accent-confirmed)';
      case 'failed':
        return 'var(--accent-failed)';
      case 'rescheduled':
        return 'var(--accent-rescheduled)';
      default:
        return 'var(--accent-pending)';
    }
  }
}