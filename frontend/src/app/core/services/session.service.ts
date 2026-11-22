import { Injectable, signal } from '@angular/core';

export type StaffRole = 'head' | 'committee' | 'cashier';

@Injectable({ providedIn: 'root' })
export class SessionService {
  name = signal<string>(localStorage.getItem('pn_staff_name') || '');
  role = signal<StaffRole>((localStorage.getItem('pn_staff_role') as StaffRole) || 'cashier');

  set(name: string, role: StaffRole): void {
    this.name.set(name);
    this.role.set(role);
    localStorage.setItem('pn_staff_name', name);
    localStorage.setItem('pn_staff_role', role);
  }

  canApprove(): boolean {
    return this.role() === 'head';
  }
}