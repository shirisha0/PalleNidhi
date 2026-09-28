-- Reference schema (SQLAlchemy's Base.metadata.create_all() will generate this
-- automatically on first run, but keep this for documentation / manual setup).

CREATE DATABASE IF NOT EXISTS voice_reminder_db;
USE voice_reminder_db;

CREATE TABLE contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    timezone VARCHAR(64) DEFAULT 'UTC',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_phone_number (phone_number)
);

CREATE TABLE reminders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contact_id INT NOT NULL,
    context TEXT NOT NULL,
    scheduled_time DATETIME NOT NULL,
    status ENUM('pending','calling','confirmed','rescheduled','completed','failed')
        DEFAULT 'pending',
    generated_prompt TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    INDEX idx_scheduled_time (scheduled_time),
    INDEX idx_status (status)
);

CREATE TABLE call_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reminder_id INT NOT NULL,
    call_provider_id VARCHAR(255),
    transcript TEXT,
    duration_seconds FLOAT,
    extracted_intent VARCHAR(64),
    raw_payload TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE
);
