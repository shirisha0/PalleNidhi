from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import (
    contacts, reminders, webhook, twilio_voice,
    loans, transactions, fund, loan_reminders,
)
from app.scheduler.reminder_job import start_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables if they don't exist (use Alembic migrations in production)
    Base.metadata.create_all(bind=engine)
    scheduler = start_scheduler()
    yield
    scheduler.shutdown()


app = FastAPI(title="Pellenidhi - Village Bank & Reminder Agent", lifespan=lifespan)

# Allow the Angular dev server to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Reminder calling (existing)
app.include_router(contacts.router)
app.include_router(reminders.router)
app.include_router(webhook.router)
app.include_router(twilio_voice.router)

# Village bank
app.include_router(loans.router)
app.include_router(transactions.router)
app.include_router(transactions.receipts_router)
app.include_router(fund.router)
app.include_router(loan_reminders.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}