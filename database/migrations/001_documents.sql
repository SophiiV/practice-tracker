-- Додаткова схема застосовується і до вже наявної БД без видалення даних.
CREATE TABLE IF NOT EXISTS practice_contracts (
 assignment_id INTEGER PRIMARY KEY REFERENCES assignments(id) ON DELETE CASCADE,
 number TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT '', signedOn TEXT NOT NULL DEFAULT '',
 enterpriseName TEXT NOT NULL DEFAULT '', representative TEXT NOT NULL DEFAULT '', authority TEXT NOT NULL DEFAULT '',
 address TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', course TEXT NOT NULL DEFAULT '',
 specialty TEXT NOT NULL DEFAULT '', validUntil TEXT NOT NULL DEFAULT '', additionalTerms TEXT NOT NULL DEFAULT '',
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS diary_documents (
 assignment_id INTEGER PRIMARY KEY REFERENCES assignments(id) ON DELETE CASCADE,
 faculty TEXT NOT NULL DEFAULT '', department TEXT NOT NULL DEFAULT '', qualification TEXT NOT NULL DEFAULT '',
 educationProgram TEXT NOT NULL DEFAULT '', specialty TEXT NOT NULL DEFAULT '', course TEXT NOT NULL DEFAULT '',
 arrivedOn TEXT NOT NULL DEFAULT '', departedOn TEXT NOT NULL DEFAULT '', responsiblePerson TEXT NOT NULL DEFAULT '',
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS diary_schedule (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 assignment_id INTEGER NOT NULL REFERENCES diary_documents(assignment_id) ON DELETE CASCADE,
 position INTEGER NOT NULL CHECK(position >= 0), title TEXT NOT NULL,
 start_date TEXT NOT NULL, end_date TEXT NOT NULL,
 completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0,1)),
 UNIQUE(assignment_id, position), CHECK(end_date >= start_date)
);
