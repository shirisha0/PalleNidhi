import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav class="topnav">
      <div class="brand">
        <span class="brand-dot"></span>
        Ringback
      </div>
      <div class="nav-links">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">Dashboard</a>
        <a routerLink="/contacts" routerLinkActive="active">Contacts</a>
        <a routerLink="/reminders/new" routerLinkActive="active" class="nav-cta">+ New Reminder</a>
        <a routerLink="/contacts/new" routerLinkActive="active" class="nav-cta-outline">+ Contact</a>
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
      padding: 20px 32px;
      border-bottom: 1px solid var(--border);
      max-width: 1040px;
      margin: 0 auto;
    }
    .brand {
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 700;
      font-size: 1.15rem;
      display: flex;
      align-items: center;
      gap: 8px;
      letter-spacing: -0.01em;
    }
    .brand-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--accent-ring);
      box-shadow: 0 0 0 4px rgba(255, 176, 32, 0.15);
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 22px;
    }
    .nav-links a {
      color: var(--text-muted);
      font-size: 0.9rem;
      font-weight: 500;
    }
    .nav-links a.active,
    .nav-links a:hover {
      color: var(--text);
    }
    .nav-cta {
      background: var(--accent-ring);
      color: #171200 !important;
      padding: 8px 14px;
      border-radius: 8px;
      font-weight: 600 !important;
    }
    .nav-cta-outline {
      border: 1px solid var(--border);
      padding: 8px 14px;
      border-radius: 8px;
    }
    .page {
      max-width: 1040px;
      margin: 0 auto;
      padding: 32px;
    }
  `],
})
export class AppComponent {
  title = 'ai-voice-reminder-frontend';
}