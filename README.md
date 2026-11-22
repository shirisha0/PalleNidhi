# Pellenidhi: Village Bank & AI Voice Reminder Agent

A digital ledger for a village savings-and-loan fund, with an AI voice agent that phones borrowers when a payment is due, listens to their spoken reply, and logs the outcome.

It started as a general outbound voice reminder system and grew into a tool for a real problem: a village fund that is run on paper, with a head, an 11-member committee, and a cashier tracking who borrowed what and who owes what.

## What it does

- **Loans:** request, approve, hand over the money, repay, close.
- **Interest:** accrues daily on the outstanding principal, with a higher penalty rate once a loan is overdue.
- **Permanent records:** the ledger is append-only. Mistakes are fixed with a reversing entry, never by editing or deleting.
- **Receipts:** every deposit, payout and repayment gets an auto-numbered receipt (`PN-000001`).
- **Fund balance:** deposits plus repayments minus loans given out, updated after every transaction.
- **Automatic collection calls:** the agent phones borrowers 3 days before the due date, on the due date, and every 3 days while overdue, then saves what they said.
- **Reminder calls:** the original feature still works for any task or deadline, not only loans.
- **Live dashboard:** reminder statuses, the fund overview, loans, the cashier desk, and a log of every call and reply.

## Architecture

```
Angular (reminder dashboard + bank screens) ──HTTP──> FastAPI
                                                         │
                                                         ├── MySQL (contacts, loans, transactions,
                                                         │          receipts, reminders, call_logs)
                                                         ├── Ledger service (interest, balances, reversals)
                                                         ├── APScheduler
                                                         │     ├── every minute: place calls for due reminders
                                                         │     └── every hour: queue calls for due and overdue loans
                                                         ├── GenAI service (script fallback + reply classification)
                                                         └── Twilio ── outbound call ──> borrower's phone
                                                                ▲                              │
                                                                └── TwiML webhooks <───────────┘
                                                                    /twilio/voice, /twilio/gather-response
                                                                    (exposed to Twilio through ngrok in development)
```

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Angular 19 (standalone components) |
| Backend | Python, FastAPI, SQLAlchemy |
| Database | MySQL |
| Scheduling | APScheduler |
| Voice | Twilio Programmable Voice (TwiML `<Say>` and `<Gather>`) |
| GenAI | OpenAI-compatible chat completions API |
| Dev tunnel | ngrok |

## How a collection call works

1. The hourly scan finds loans that are due soon, due today, or overdue (calls are made between 9:00 and 19:00 IST, at most once per loan per day).
2. It queues a reminder whose message is a **fixed template filled with the exact amount from the ledger**. Amounts never pass through an LLM, so a model cannot change a number.
3. The minute scheduler places the call through Twilio.
4. When the borrower answers, Twilio asks `/twilio/voice` what to say and listens for a spoken reply.
5. Twilio sends the transcript to `/twilio/gather-response`. The reply is classified as confirmed or rescheduled using keyword rules first, with the LLM only as a backup for replies the rules do not recognise.
6. The reply and outcome are saved in `call_logs`, and the dashboard updates.

"Confirmed" means the borrower promised to pay. The loan stays overdue until the cashier records the actual repayment.

If the LLM API is unavailable (no key, quota exceeded, network error), calls still go out using plain templates.

## Loan and interest rules

- Simple interest, charged monthly on the outstanding principal and accrued daily (a month is 30 days).
- After the due date, the monthly rate rises by the loan's penalty step for every started 30-day block of lateness.
- A repayment clears accrued interest first, and the rest reduces the principal. Partial repayments are allowed.
- A reversed repayment is ignored by the interest calculation, as if it never happened, while staying visible in the history.

Worked example: a loan of ₹2,000 at 2% per month, issued 1 July and due 20 September, checked on 28 September. That is 81 days at 2% (₹108.00) plus 8 days at the penalty rate of 3% (₹16.00), so ₹124.00 interest and ₹2,124.00 in total.

## Screens

| Route | Screen |
|---|---|
| `/` | Reminder dashboard with live statuses and the conversation for each call |
| `/contacts` | All villagers, with address. Click a row to open that villager |
| `/bank/villagers/new` | Add a villager with an optional opening deposit |
| `/bank/villagers/:id` | One villager's loans and full transaction history |
| `/bank` | Fund overview: balance, lent out, interest earned, overdue loans |
| `/bank/loans` | Loans by status, with approve, reject, hand over money, and call now |
| `/bank/cashier` | Record deposits and repayments, with an instant receipt |
| `/bank/follow-ups` | Every collection call and what the borrower said |
| `/reminders/new` | Schedule a general reminder call |

## Key endpoints

Interactive docs are at `http://localhost:8000/docs`.

| Area | Endpoints |
|---|---|
| Contacts | `POST/GET /contacts/`, `GET/PUT/DELETE /contacts/{id}` (delete is blocked if the villager has loans or transactions) |
| Reminders | `POST/GET /reminders/`, `GET /reminders/{id}/call-logs` |
| Loans | `POST/GET /loans/` (filter by `status`, `contact_id`), `GET /loans/{id}`, `POST /loans/{id}/approve`, `/reject`, `/disburse` |
| Transactions | `POST /transactions/deposit`, `POST /transactions/repayment`, `POST /transactions/{id}/reverse`, `GET /transactions/` |
| Receipts | `GET /receipts/`, `GET /receipts/{receipt_no}` |
| Fund | `GET /fund/summary` |
| Collection calls | `GET /loan-reminders/follow-ups`, `POST /loan-reminders/{loan_id}/call-now`, `POST /loan-reminders/scan` |
| Twilio webhooks | `POST /twilio/voice`, `POST /twilio/gather-response` |
| Generic webhook | `POST /webhook/call-status` (accepts a call outcome payload, useful for simulated calls) |

## Setup

### Prerequisites

- Python 3.11 or 3.12 (very new Python versions can fail to build some dependencies)
- Node.js 20 and Angular CLI 19
- MySQL
- For real calls: a Twilio account and ngrok

### Backend

```
cd backend
python -m venv venv
venv\Scripts\activate          # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
copy .env.example .env         # macOS/Linux: cp .env.example .env
```

Create the database, then start the server. Tables are created automatically on first run.

```sql
CREATE DATABASE voice_reminder_db;
```

```
uvicorn app.main:app --reload --port 8000
```

If you already had a database from an earlier version, add the newer columns once (a fresh database does not need this):

```sql
ALTER TABLE contacts ADD COLUMN address VARCHAR(255) NULL;
ALTER TABLE reminders
  ADD COLUMN loan_id INT NULL,
  ADD INDEX ix_reminders_loan_id (loan_id),
  ADD CONSTRAINT fk_reminders_loan FOREIGN KEY (loan_id) REFERENCES loans(id);
```

### Environment variables (`backend/.env`)

```
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=voice_reminder_db

# GenAI (optional; the app works with templates if this is empty or fails)
GENAI_API_KEY=
GENAI_MODEL=gpt-4o-mini

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
PUBLIC_BASE_URL=               # your public https URL, e.g. the ngrok address

# Optional
WEBHOOK_SECRET=
SCHEDULER_POLL_INTERVAL_SECONDS=60
```

Never commit `.env`. It contains your keys.

### Frontend

```
cd frontend
npm install
ng serve
```

Open `http://localhost:4200`.

### Real phone calls

Twilio must be able to reach your backend while a call is in progress, so expose it:

```
ngrok http 8000
```

Copy the `https://...` forwarding URL into `PUBLIC_BASE_URL` in `.env`, then restart the backend. The ngrok URL changes every time ngrok restarts, so update `.env` each time. Avoid saving code files during a live call, because `--reload` restarts the server.

To trigger a call by hand, use `POST /loan-reminders/{loan_id}/call-now` in the Swagger docs or the **Call now** button on the Loans screen.

## Tests

The interest and ledger logic is tested on its own, before any API or screen depends on it:

```
cd backend
python test_ledger.py
```

It runs 8 hand-calculated scenarios (interest on the due date, overdue penalty rates, partial repayments, reversals, fund balance). All should print `PASS`.

## Project structure

```
backend/
  app/
    models/        contact, reminder, call_log, loan, transaction, receipt
    schemas/       request and response models
    routers/       contacts, reminders, webhook, twilio_voice,
                   loans, transactions, fund, loan_reminders
    services/      ledger_service (interest math), bank_service,
                   loan_reminders, genai_service, voice_api_service (Twilio)
    scheduler/     reminder_job (minute and hourly jobs)
  test_ledger.py
frontend/
  src/app/
    core/          models and services
    features/      dashboard, contacts, reminders, bank (fund, loans,
                   cashier, follow-ups, villager screens)
```

## Current limitations

- **Roles are a selector, not a login.** The nav bar lets you pick Head, Committee or Cashier and only the Head sees approve and reject. Real authentication is the next step.
- **Twilio trial accounts** can only call numbers you have verified, and play a short trial-account notice before the message. Calling real villagers needs a paid Twilio account.
- **Unanswered calls** can leave a reminder on `calling`. Twilio status callbacks would fix this.
- **English only** for now.
- **Repayments are dated today.** Back-dated entries are not supported, because they would reorder the interest calculation.
- The call is one question and one spoken answer, not an open conversation.

## Next steps

- Staff login with roles (JWT) on the API and the Angular app
- Telugu calls and screens, so villagers understand the reminders
- Alembic migrations instead of `create_all`
- Twilio status callbacks for unanswered calls and retries with backoff
- Deployment beyond a local machine
