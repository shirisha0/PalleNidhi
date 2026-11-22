import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { SessionService, StaffRole } from './core/services/session.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav class="topnav">
      <div class="brand">
        <span class="brand-dot"></span>
        Ringback
      </div>
      <div class="nav-links">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">Dashboard</a>
        <a routerLink="/contacts" routerLinkActive="active">Contacts</a>
        <a routerLink="/bank/villagers/new" routerLinkActive="active">+ Villager</a>
        <a routerLink="/bank" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">Fund</a>
        <a routerLink="/bank/loans" routerLinkActive="active">Loans</a>
        <a routerLink="/bank/cashier" routerLinkActive="active">Cashier</a>
        <a routerLink="/bank/follow-ups" routerLinkActive="active">Calls</a>
        <a routerLink="/reminders/new" routerLinkActive="active" class="nav-cta">+ Reminder</a>
      </div>
      <div class="whoami">
        <input [ngModel]="session.name()" (ngModelChange)="session.set($event, role)" placeholder="Your name" />
        <select [ngModel]="role" (ngModelChange)="onRole($event)">
          <option value="head">Head</option>
          <option value="committee">Committee</option>
          <option value="cashier">Cashier</option>
        </select>
      </div>
    </nav>
    <main class="page">
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    .topnav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 32px;
      border-bottom: 1px solid var(--border);
      max-width: 1180px;
      margin: 0 auto;
      flex-wrap: wrap;
      gap: 12px;
    }
    .brand {
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 700;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-dot {
      width: 9px; height: 9px; border-radius: 50%;
      background: var(--accent-ring);
      box-shadow: 0 0 0 4px rgba(255, 176, 32, 0.15);
    }
    .nav-links { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
    .nav-links a { color: var(--text-muted); font-size: 0.88rem; font-weight: 500; }
    .nav-links a.active, .nav-links a:hover { color: var(--text); }
    .nav-cta {
      background: var(--accent-ring); color: #171200 !important;
      padding: 7px 12px; border-radius: 8px; font-weight: 600 !important;
    }
    .whoami { display: flex; gap: 6px; }
    .whoami input, .whoami select {
      background: var(--surface-raised); border: 1px solid var(--border);
      color: var(--text); padding: 6px 9px; border-radius: 6px; font-size: 0.82rem;
    }
    .whoami input { width: 110px; }
    .page { max-width: 1180px; margin: 0 auto; padding: 0; }
  `],
})
export class AppComponent {
  role: StaffRole;

  constructor(public session: SessionService) {
    this.role = this.session.role();
  }

  onRole(r: StaffRole): void {
    this.role = r;
    this.session.set(this.session.name(), r);
  }
}