# Сервер&nbsp;

Express 4 \+ Node.js 22.13+ (`node:sqlite`), bcrypt, JWT. Python 3 стандартної комплектації потрібен для DOCX.

## Команди

```sh
npm ci
npm start
npm test
```

Нова база створюється автоматично. Наявна база отримує міграцію документів без скидання даних. `npm run init-db` **видаляє попередню базу** і потрібний лише для свідомого повернення до демонстраційних даних.

Маршрути документів:

| Метод | URL | Доступ |
| :---- | :---- | :---- |
| POST | /auth/register | Реєстрація студента |
| GET | /documents/:id/:kind | Власник, керівник направлення, admin |
| PUT | /documents/:id/:kind | Студент-власник |
| GET | /documents/:id/:kind/download | Власник, керівник направлення, admin |
| GET | /materials/safety.pdf | Публічний університетський PDF |
| GET | /materials/contract.docx | Порожній бланк договору |
| GET | /materials/diary.docx | Порожній бланк щоденника |

`:kind` — `contract` або `diary`; `:id` — ідентифікатор направлення. Параметр `?download=1` для safety.pdf примусово завантажує файл. Інші маршрути: /auth/login, /auth/me, /assignments, /diaryEntries, /enterprises, /students, /teachers, /periods, /grades, /health.

API-тести працюють на тимчасовій БД. Основна інструкція запуску і облікові записи — ../README.md.

Змінні середовища: PORT, DB\_PATH, JWT\_SECRET, PYTHON\_BIN. Демонстраційні паролі: `praktyka2026`.

У цьому етапі `npm test` запускає 38 API-тестів із `tests/api.test.js`.