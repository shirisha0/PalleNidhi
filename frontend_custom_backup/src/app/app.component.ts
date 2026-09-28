import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <nav>
      <a routerLink="/">Dashboard</a>
      <a routerLink="/reminders/new">New Reminder</a>
      <a routerLink="/contacts">Contacts</a>
      <a routerLink="/contacts/new">New Contact</a>
    </nav>
    <router-outlet></router-outlet>
  `,
})
export class AppComponent {
  title = 'ai-voice-reminder-frontend';
}
