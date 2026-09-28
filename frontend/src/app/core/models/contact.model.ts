export interface Contact {
  id: number;
  name: string;
  phone_number: string;
  email?: string;
  timezone?: string;
  created_at: string;
}

export interface ContactCreatePayload {
  name: string;
  phone_number: string;
  email?: string;
  timezone?: string;
}
