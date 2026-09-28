import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ReminderFormComponent } from './features/reminders/reminder-form/reminder-form.component';
import { ContactListComponent } from './features/contacts/contact-list/contact-list.component';
import { ContactFormComponent } from './features/contacts/contact-form/contact-form.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'reminders/new', component: ReminderFormComponent },
  { path: 'contacts', component: ContactListComponent },
  { path: 'contacts/new', component: ContactFormComponent },
  { path: '**', redirectTo: '' },
];
