import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContactService } from '../../../core/services/contact.service';
import { Contact } from '../../../core/models/contact.model';

@Component({
  selector: 'app-contact-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2>Contacts</h2>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Phone</th>
          <th>Email</th>
          <th>Timezone</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let c of contacts">
          <td>{{ c.id }}</td>
          <td>{{ c.name }}</td>
          <td>{{ c.phone_number }}</td>
          <td>{{ c.email || '—' }}</td>
          <td>{{ c.timezone }}</td>
          <td><button (click)="remove(c.id)">Delete</button></td>
        </tr>
      </tbody>
    </table>
  `,
})
export class ContactListComponent implements OnInit {
  contacts: Contact[] = [];

  constructor(private contactService: ContactService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.contactService.list().subscribe((data) => (this.contacts = data));
  }

  remove(id: number): void {
    this.contactService.delete(id).subscribe(() => this.load());
  }
}
