import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Contact, ContactCreatePayload } from '../models/contact.model';

@Injectable({ providedIn: 'root' })
export class ContactService {
  private baseUrl = `${environment.apiUrl}/contacts`;

  constructor(private http: HttpClient) {}

  list(): Observable<Contact[]> {
    return this.http.get<Contact[]>(`${this.baseUrl}/`);
  }

  get(id: number): Observable<Contact> {
    return this.http.get<Contact>(`${this.baseUrl}/${id}`);
  }

  create(payload: ContactCreatePayload): Observable<Contact> {
    return this.http.post<Contact>(`${this.baseUrl}/`, payload);
  }

  update(id: number, payload: Partial<ContactCreatePayload>): Observable<Contact> {
    return this.http.put<Contact>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
