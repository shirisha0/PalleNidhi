import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Reminder, ReminderCreatePayload } from '../models/reminder.model';

@Injectable({ providedIn: 'root' })
export class ReminderService {
  private baseUrl = `${environment.apiUrl}/reminders`;

  constructor(private http: HttpClient) {}

  list(): Observable<Reminder[]> {
    return this.http.get<Reminder[]>(`${this.baseUrl}/`);
  }

  get(id: number): Observable<Reminder> {
    return this.http.get<Reminder>(`${this.baseUrl}/${id}`);
  }

  create(payload: ReminderCreatePayload): Observable<Reminder> {
    return this.http.post<Reminder>(`${this.baseUrl}/`, payload);
  }

  update(id: number, payload: Partial<ReminderCreatePayload>): Observable<Reminder> {
    return this.http.put<Reminder>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // Poll every N ms for live status updates on the dashboard
  getCallLogs(reminderId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/${reminderId}/call-logs`);
  }
}
