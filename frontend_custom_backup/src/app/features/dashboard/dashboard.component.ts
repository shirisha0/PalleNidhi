import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, interval, startWith, switchMap } from 'rxjs';
import { ReminderService } from '../../core/services/reminder.service';
import { Reminder } from '../../core/models/reminder.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2>Reminders</h2>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Context</th>
          <th>Scheduled</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let r of reminders">
          <td>{{ r.id }}</td>
          <td>{{ r.context }}</td>
          <td>{{ r.scheduled_time | date: 'short' }}</td>
          <td>
            <span class="status" [class]="r.status">{{ r.status }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  `,
})
export class DashboardComponent implements OnInit, OnDestroy {
  reminders: Reminder[] = [];
  private sub?: Subscription;

  constructor(private reminderService: ReminderService) {}

  ngOnInit(): void {
    // Poll every 10s so statuses (pending -> calling -> confirmed, etc.) update live
    this.sub = interval(10000)
      .pipe(
        startWith(0),
        switchMap(() => this.reminderService.list())
      )
      .subscribe((data) => (this.reminders = data));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
