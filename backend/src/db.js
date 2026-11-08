// Підключення до бази даних SQLite.
// Використано вбудований у Node.js модуль node:sqlite — додаткові бібліотеки не потрібні.
// Якщо файлу бази ще немає, вона створюється зі schema.sql і наповнюється з seed.sql.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

function createDatabase(dbPath) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const fresh = new DatabaseSync(dbPath);
  fresh.exec(fs.readFileSync(config.schemaPath, 'utf8'));
  fresh.exec(fs.readFileSync(config.seedPath, 'utf8'));
  return fresh;
}

const exists = fs.existsSync(config.dbPath);
export const db = exists ? new DatabaseSync(config.dbPath) : createDatabase(config.dbPath);

// Перевірка зовнішніх ключів у SQLite вимкнена за замовчуванням — вмикаємо для кожного з'єднання
db.exec('PRAGMA foreign_keys = ON');

// Ідемпотентна міграція зберігає наявні направлення і записи.
db.exec(fs.readFileSync(path.join(path.dirname(config.schemaPath), 'migrations', '001_documents.sql'), 'utf8'));

console.log(`[db] база даних: ${config.dbPath}${exists ? '' : ' (створено)'}`);

// Допоміжні функції, щоб не писати prepare() у кожній моделі
export const all = (sql, ...params) => db.prepare(sql).all(...params);
export const get = (sql, ...params) => db.prepare(sql).get(...params);
export const run = (sql, ...params) => db.prepare(sql).run(...params);
