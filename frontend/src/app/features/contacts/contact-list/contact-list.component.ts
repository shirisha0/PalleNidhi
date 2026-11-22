import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
          <th>Address</th>
          <th>Email</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let c of contacts" class="row" (click)="open(c)">
          <td>{{ c.id }}</td>
          <td>{{ c.name }}</td>
          <td>{{ c.phone_number }}</td>
          <td>{{ c.address || '—' }}</td>
          <td>{{ c.email || '—' }}</td>
          <td><button (click)="remove(c); $event.stopPropagation()">Delete</button></td>
        </tr>
      </tbody>
    </table>
  `,
  styles: [`.row { cursor: pointer; }`],
})
export class ContactListComponent implements OnInit {
  contacts: Contact[] = [];

  constructor(private contactService: ContactService, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.contactService.list().subscribe((data) => (this.contacts = data));
  }

  open(c: Contact): void {
    this.router.navigate(['/bank/villagers', c.id]);
  }

  remove(c: Contact): void {
    if (!confirm(`Delete ${c.name}?`)) return;
    this.contactService.delete(c.id).subscribe({
      next: () => this.load(),
      error: (e) => alert(e?.error?.detail || 'Could not delete this villager.'),
    });
  }
}