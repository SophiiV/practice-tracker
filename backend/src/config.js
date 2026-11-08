// Налаштування серверної частини.
// Усі значення можна перевизначити через змінні середовища — тому той самий код
// працює і під час розробки, і під час тестування, і на сервері.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT) || 3001,
  // Шлях до файлу бази даних, спроєктованої у лабораторній роботі № 5
  dbPath: process.env.DB_PATH || path.join(here, '..', '..', 'database', 'practice.db'),
  // Файли SQL для створення та наповнення бази
  schemaPath: path.join(here, '..', '..', 'database', 'schema.sql'),
  seedPath: path.join(here, '..', '..', 'database', 'seed.sql'),
  // Секретний ключ для підпису токенів. На справжньому сервері задається змінною середовища
  jwtSecret: process.env.JWT_SECRET || 'practice-tracker-dev-secret',
  jwtExpiresIn: '24h',
};
