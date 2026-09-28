# AI Voice Reminder Agent

Outbound AI voice reminder system: **Angular** frontend, **Python (FastAPI)** backend,
**GenAI** (LLM) for dynamic prompt generation and call-intent classification, and a
managed voice platform (Vapi / Retell AI) for the actual phone call.

## Architecture

```
Angular (dashboard) ──HTTP──> FastAPI (backend)
                                  │
                                  ├── MySQL (Contacts, Reminders, Call_Logs)
                                  ├── APScheduler (polls for due reminders)
                                  ├── GenAI service (prompt + intent)
                                  └── Voice API (Vapi/Retell) ──webhook──> FastAPI
```

## Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env           # fill in DB creds, GENAI_API_KEY, VOICE_API_KEY, etc.

# Create the MySQL database first:
#   CREATE DATABASE voice_reminder_db;

uvicorn app.main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs` (FastAPI auto-generated Swagger UI).

### Key endpoints
- `POST /contacts/` — add a contact
- `POST /reminders/` — schedule a reminder (contact_id, context, scheduled_time)
- `GET /reminders/` — list all reminders + live status
- `POST /webhook/call-status` — voice provider posts call outcome here

## Frontend Setup

```bash
cd frontend
npm install
ng serve
```

Visit `http://localhost:4200`. The dashboard polls `/reminders/` every 10s to reflect
live status changes (pending → calling → confirmed/rescheduled/failed).

> Note: this scaffold gives you the core files (services, models, routes, two
> components). If starting fresh, run `ng new ai-voice-reminder-frontend --standalone`
> and drop these files in — that generates the remaining Angular CLI config
> (angular.json, tsconfig, index.html) for you.

## Voice Provider Setup (Vapi example)

1. Create an assistant in your Vapi/Retell dashboard, get `VOICE_ASSISTANT_ID` and
   `VOICE_PHONE_NUMBER_ID`.
2. Set the provider's webhook URL to point at your backend:
   `https://<your-domain>/webhook/call-status`
3. When a reminder is due, the scheduler generates a prompt via GenAI, then calls
   `place_outbound_call()` which hits the Vapi `/call` endpoint with that prompt
   injected as the assistant's system message.

## GenAI Integration

`app/services/genai_service.py` calls an OpenAI-compatible chat completions endpoint to:
1. **Generate the call script** dynamically from the reminder's `context` field
   (instead of a static template).
2. **Classify call intent** (`confirmed` / `rescheduled` / `voicemail` / `no_answer`)
   from the transcript, if the voice provider doesn't already return this.

Swap the API base URL / model in `config.py` to use Claude, Azure OpenAI, or any
OpenAI-compatible provider.

## Next Steps
- Add Alembic migrations instead of `Base.metadata.create_all`
- Add auth (JWT) to the FastAPI routes and Angular app
- Add retry/backoff logic for failed calls
- Add WebSocket push instead of polling for real-time dashboard updates
