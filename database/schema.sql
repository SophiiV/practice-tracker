-- ============================================================
--  Інформаційна система обліку та контролю проходження
--  студентами виробничої практики («Трекер Практики»)
--  Схема бази даних (SQLite 3), 11 таблиць; розраховані оцінки зберігаються денормалізовано
--  Автор: Василюк С. Я., ІПЗ-41
-- ============================================================

PRAGMA foreign_keys = ON;

-- Облікові записи всіх користувачів (спільна таблиця для трьох ролей)
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name     TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
    phone         TEXT
);

-- Студенти: додаткові дані для ролі student (зв'язок 1:1 з users)
CREATE TABLE IF NOT EXISTS students (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id            INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    group_name         TEXT    NOT NULL,            -- напр. 'ІПЗ-41'
    record_book_number TEXT    NOT NULL UNIQUE      -- номер залікової книжки
);

-- Викладачі — керівники практики від кафедри (зв'язок 1:1 з users)
CREATE TABLE IF NOT EXISTS teachers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    department TEXT    NOT NULL,
    position   TEXT    NOT NULL                     -- доцент, старший викладач тощо
);

-- Бази практики (підприємства, установи)
CREATE TABLE IF NOT EXISTS enterprises (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    address         TEXT    NOT NULL,
    phone           TEXT,
    email           TEXT,
    contract_number TEXT,                           -- номер договору про проведення практики
    contract_date   TEXT,                           -- дата договору, формат YYYY-MM-DD
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

-- Періоди практики: вид практики у конкретному навчальному році з термінами
CREATE TABLE IF NOT EXISTS practice_periods (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    type          TEXT    NOT NULL CHECK (type IN ('навчальна', 'виробнича', 'переддипломна')),
    academic_year TEXT    NOT NULL,                 -- напр. '2025/2026'
    semester      INTEGER NOT NULL CHECK (semester IN (1, 2)),
    start_date    TEXT    NOT NULL,
    end_date      TEXT    NOT NULL,
    hours         INTEGER NOT NULL CHECK (hours > 0),
    CHECK (end_date >= start_date)
);

-- Направлення студента на практику — центральна таблиця.
-- Реалізує зв'язок M:N між студентами та базами практики (з атрибутами).
CREATE TABLE IF NOT EXISTS assignments (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id        INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    period_id         INTEGER NOT NULL REFERENCES practice_periods(id),
    enterprise_id     INTEGER NOT NULL REFERENCES enterprises(id),
    teacher_id        INTEGER NOT NULL REFERENCES teachers(id),
    supervisor_name   TEXT,                         -- керівник від бази практики (ПІБ)
    order_number      TEXT,                         -- номер наказу про направлення
    order_date        TEXT,
    status            TEXT NOT NULL DEFAULT 'assigned'
                      CHECK (status IN ('assigned', 'in_progress', 'report_submitted', 'defended')),
    -- дані про звіт з практики (звіт один на направлення, тому зберігається тут)
    report_file_name  TEXT,
    report_submitted_at TEXT,
    report_status     TEXT CHECK (report_status IN ('submitted', 'needs_revision', 'accepted')),
    UNIQUE (student_id, period_id)                  -- один студент — одне направлення на період
);

-- Записи щоденника практики (1:M до assignments)
CREATE TABLE IF NOT EXISTS diary_entries (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id   INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    entry_date      TEXT    NOT NULL,
    description     TEXT    NOT NULL,
    hours           REAL    NOT NULL CHECK (hours > 0 AND hours <= 12),
    status          TEXT    NOT NULL DEFAULT 'submitted'
                    CHECK (status IN ('submitted', 'approved', 'rejected')),
    teacher_comment TEXT
);

-- Результати захисту практики (1:1 до assignments; з'являється після захисту)
CREATE TABLE IF NOT EXISTS grades (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id    INTEGER NOT NULL UNIQUE REFERENCES assignments(id) ON DELETE CASCADE,
    enterprise_grade INTEGER NOT NULL CHECK (enterprise_grade BETWEEN 0 AND 100), -- оцінка бази практики
    teacher_grade    INTEGER NOT NULL CHECK (teacher_grade BETWEEN 0 AND 100),    -- оцінка керівника
    final_score      INTEGER NOT NULL CHECK (final_score BETWEEN 0 AND 100),
    ects_grade       TEXT    NOT NULL CHECK (ects_grade IN ('A', 'B', 'C', 'D', 'E', 'FX', 'F')),
    national_grade   TEXT    NOT NULL CHECK (national_grade IN ('відмінно', 'добре', 'задовільно', 'незадовільно')),
    defense_date     TEXT    NOT NULL,
    comment          TEXT
);

-- Індекси для пришвидшення типових запитів
CREATE INDEX IF NOT EXISTS idx_assignments_student ON assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_diary_assignment    ON diary_entries(assignment_id, entry_date);
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
