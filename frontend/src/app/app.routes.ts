import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ReminderFormComponent } from './features/reminders/reminder-form/reminder-form.component';
import { ContactListComponent } from './features/contacts/contact-list/contact-list.component';
import { ContactFormComponent } from './features/contacts/contact-form/contact-form.component';
import { FundOverviewComponent } from './features/bank/fund-overview/fund-overview.component';
import { LoansComponent } from './features/bank/loans/loans.component';
import { CashierDeskComponent } from './features/bank/cashier-desk/cashier-desk.component';
import { FollowUpsComponent } from './features/bank/follow-ups/follow-ups.component';
import { VillagerDetailComponent } from './features/bank/villager-detail/villager-detail.component';
import { VillagerOnboardComponent } from './features/bank/villager-onboard/villager-onboard.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'reminders/new', component: ReminderFormComponent },
  { path: 'contacts', component: ContactListComponent },
  { path: 'contacts/new', component: ContactFormComponent },
  { path: 'bank', component: FundOverviewComponent },
  { path: 'bank/loans', component: LoansComponent },
  { path: 'bank/cashier', component: CashierDeskComponent },
  { path: 'bank/follow-ups', component: FollowUpsComponent },
  { path: 'bank/villagers/new', component: VillagerOnboardComponent },
  { path: 'bank/villagers/:id', component: VillagerDetailComponent },
  { path: '**', redirectTo: '' },
];