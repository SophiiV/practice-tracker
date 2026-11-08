// Створення бази даних з нуля: таблиці зі schema.sql та тестові дані з seed.sql.
// Запуск: npm run init-db
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

if (fs.existsSync(config.dbPath)) {
  fs.unlinkSync(config.dbPath);
  console.log('[init-db] стару базу видалено');
}

const db = new DatabaseSync(config.dbPath);
db.exec('PRAGMA foreign_keys = ON');
db.exec(fs.readFileSync(config.schemaPath, 'utf8'));
db.exec(fs.readFileSync(config.seedPath, 'utf8'));

const count = (t) => db.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c;
console.log(`[init-db] базу створено: ${config.dbPath}`);
console.log(`[init-db] користувачів: ${count('users')}, направлень: ${count('assignments')}, записів щоденника: ${count('diary_entries')}`);
db.close();
