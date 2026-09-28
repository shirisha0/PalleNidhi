export type ReminderStatus =
  | 'pending'
  | 'calling'
  | 'confirmed'
  | 'rescheduled'
  | 'completed'
  | 'failed';

export interface Reminder {
  id: number;
  contact_id: number;
  context: string;
  scheduled_time: string; // ISO datetime
  status: ReminderStatus;
  generated_prompt?: string;
  created_at: string;
  updated_at: string;
}

export interface ReminderCreatePayload {
  contact_id: number;
  context: string;
  scheduled_time: string;
}
