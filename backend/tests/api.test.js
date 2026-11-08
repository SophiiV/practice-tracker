// Автоматичні тести REST API.
// Запуск: npm test
// Тести виконуються на окремій тимчасовій базі даних, тому робоча база не змінюється.
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Шлях до тестової бази задаємо до імпорту застосунку, щоб він підхопив саме її
const testDbPath = path.join(os.tmpdir(), `practice-test-${Date.now()}.db`);
process.env.DB_PATH = testDbPath;
process.env.JWT_SECRET = 'test-secret';

let server;
let baseUrl;

// Допоміжна функція: виконує запит і повертає статус та тіло відповіді
async function api(method, url, { token, body } = {}) {
  const res = await fetch(baseUrl + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const login = async (email, password = 'praktyka2026') =>
  (await api('POST', '/auth/login', { body: { email, password } })).body;

let adminToken, teacherToken, studentToken;

before(async () => {
  const { app } = await import('../src/app.js');
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://localhost:${server.address().port}`;

  adminToken = (await login('admin@pnu.edu.ua')).token;
  teacherToken = (await login('mykola.pikuliak@cnu.edu.ua')).token;
  studentToken = (await login('sofiia.vasyliuk.23@pnu.edu.ua')).token;
});

after(() => {
  server.close();
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
});

describe('Автентифікація', () => {
  test('вхід з правильними даними повертає токен і дані користувача', async () => {
    const { status, body } = await api('POST', '/auth/login', {
      body: { email: 'admin@pnu.edu.ua', password: 'praktyka2026' },
    });
    assert.equal(status, 200);
    assert.ok(body.token, 'у відповіді має бути токен');
    assert.equal(body.user.role, 'admin');
    assert.equal(body.user.passwordHash, undefined, 'хеш пароля не повинен передаватися клієнту');
  });

  test('вхід з невірним паролем повертає 401', async () => {
    const { status, body } = await api('POST', '/auth/login', {
      body: { email: 'admin@pnu.edu.ua', password: 'невірний' },
    });
    assert.equal(status, 401);
    assert.match(body.message, /Невірна/);
  });

  test('вхід без пароля повертає 422 з переліком полів', async () => {
    const { status, body } = await api('POST', '/auth/login', { body: { email: 'admin@pnu.edu.ua' } });
    assert.equal(status, 422);
    assert.ok(body.details.password);
  });

  test('запит без токена повертає 401', async () => {
    const { status } = await api('GET', '/assignments');
    assert.equal(status, 401);
  });

  test('запит з недійсним токеном повертає 401', async () => {
    const { status } = await api('GET', '/assignments', { token: 'eyJhbGciOiJIUzI1NiJ9.aW52YWxpZA.signature' });
    assert.equal(status, 401);
  });

  test('GET /auth/me повертає поточного користувача', async () => {
    const { status, body } = await api('GET', '/auth/me', { token: studentToken });
    assert.equal(status, 200);
    assert.equal(body.role, 'student');
    assert.equal(body.studentId, 1);
  });
});

describe('Розмежування доступу за ролями', () => {
  test('адміністратор бачить усі направлення', async () => {
    const { body } = await api('GET', '/assignments', { token: adminToken });
    assert.equal(body.length, 6);
  });

  test('керівник бачить лише своїх студентів', async () => {
    const { body } = await api('GET', '/assignments', { token: teacherToken });
    assert.deepEqual(body.map((a) => a.id), [1, 2, 3, 6]);
  });

  test('студент бачить лише власні направлення', async () => {
    const { body } = await api('GET', '/assignments', { token: studentToken });
    assert.ok(body.every((a) => a.studentId === 1));
  });

  test('студент не може відкрити чуже направлення (403)', async () => {
    const { status } = await api('GET', '/assignments/4', { token: studentToken });
    assert.equal(status, 403);
  });

  test('студент не може створити направлення (403)', async () => {
    const { status } = await api('POST', '/assignments', {
      token: studentToken,
      body: { studentId: 2, periodId: 3, enterpriseId: 1, teacherId: 1 },
    });
    assert.equal(status, 403);
  });

  test('неіснуючий маршрут повертає 404', async () => {
    const { status } = await api('GET', '/unknown-resource', { token: adminToken });
    assert.equal(status, 404);
  });
});

describe('Направлення на практику', () => {
  let createdId;

  test('створення направлення повертає 201', async () => {
    const { status, body } = await api('POST', '/assignments', {
      token: adminToken,
      body: {
        studentId: 4, periodId: 3, enterpriseId: 2, teacherId: 1,
        supervisorName: 'Савчук Наталія Богданівна', orderNumber: '№ 120-с', orderDate: '2026-02-20',
      },
    });
    assert.equal(status, 201);
    assert.equal(body.status, 'assigned');
    createdId = body.id;
  });

  test('порожні обов’язкові поля повертають 422 з переліком полів', async () => {
    const { status, body } = await api('POST', '/assignments', { token: adminToken, body: {} });
    assert.equal(status, 422);
    assert.deepEqual(Object.keys(body.details).sort(), ['enterpriseId', 'periodId', 'studentId', 'teacherId']);
  });

  test('повторне направлення студента на той самий період повертає 409', async () => {
    const { status, body } = await api('POST', '/assignments', {
      token: adminToken,
      body: { studentId: 1, periodId: 2, enterpriseId: 2, teacherId: 1 },
    });
    assert.equal(status, 409);
    assert.match(body.message, /уже має направлення/);
  });

  test('посилання на неіснуючу базу практики повертає 422', async () => {
    const { status, body } = await api('POST', '/assignments', {
      token: adminToken,
      body: { studentId: 5, periodId: 3, enterpriseId: 999, teacherId: 1 },
    });
    assert.equal(status, 422);
    assert.ok(body.details.enterpriseId);
  });

  test('редагування направлення (PUT)', async () => {
    const { status, body } = await api('PUT', `/assignments/${createdId}`, {
      token: adminToken,
      body: { studentId: 4, periodId: 3, enterpriseId: 3, teacherId: 2, orderNumber: '№ 121-с' },
    });
    assert.equal(status, 200);
    assert.equal(body.enterpriseId, 3);
    assert.equal(body.orderNumber, '№ 121-с');
  });

  test('видалення направлення повертає 204', async () => {
    const { status } = await api('DELETE', `/assignments/${createdId}`, { token: adminToken });
    assert.equal(status, 204);
    const after = await api('GET', `/assignments/${createdId}`, { token: adminToken });
    assert.equal(after.status, 404);
  });

  test('_expand=student додає дані студента', async () => {
    const { body } = await api('GET', '/assignments?_expand=student', { token: adminToken });
    assert.equal(body[0].student.fullName, 'Василюк Софія Ярославівна');
  });

  test('статистика містить кількість направлень за статусами', async () => {
    const { status, body } = await api('GET', '/assignments/stats', { token: adminToken });
    assert.equal(status, 200);
    assert.equal(body.total, 6);
    assert.equal(body.byStatus.defended, 2);
  });
});

describe('Щоденник практики', () => {
  test('студент додає запис — 201, статус «на перевірці»', async () => {
    const { status, body } = await api('POST', '/diaryEntries', {
      token: studentToken,
      body: { assignmentId: 2, date: '2025-11-11', hours: 6, description: 'Виправлення зауважень до компонента форми.' },
    });
    assert.equal(status, 201);
    assert.equal(body.status, 'submitted');
  });

  test('дата поза межами практики — 422', async () => {
    const { status, body } = await api('POST', '/diaryEntries', {
      token: studentToken,
      body: { assignmentId: 2, date: '2026-01-15', hours: 6, description: 'Робота поза періодом практики.' },
    });
    assert.equal(status, 422);
    assert.match(body.details.date, /в межах практики/);
  });

  test('некоректна кількість годин і короткий опис — 422', async () => {
    const { status, body } = await api('POST', '/diaryEntries', {
      token: studentToken,
      body: { assignmentId: 2, date: '2025-11-12', hours: 20, description: 'Коротко' },
    });
    assert.equal(status, 422);
    assert.ok(body.details.hours);
    assert.ok(body.details.description);
  });

  test('студент не може додати запис до чужого направлення — 403', async () => {
    const { status } = await api('POST', '/diaryEntries', {
      token: studentToken,
      body: { assignmentId: 4, date: '2025-11-12', hours: 6, description: 'Спроба запису до чужого направлення.' },
    });
    assert.equal(status, 403);
  });

  test('керівник схвалює запис', async () => {
    const { body: entries } = await api('GET', '/diaryEntries?assignmentId=2', { token: teacherToken });
    const pending = entries.find((e) => e.status === 'submitted');
    const { status, body } = await api('PATCH', `/diaryEntries/${pending.id}`, {
      token: teacherToken,
      body: { status: 'approved' },
    });
    assert.equal(status, 200);
    assert.equal(body.status, 'approved');
  });

  test('відхилення без зауваження — 400', async () => {
    const { body: entries } = await api('GET', '/diaryEntries?assignmentId=2', { token: teacherToken });
    const { status } = await api('PATCH', `/diaryEntries/${entries[0].id}`, {
      token: teacherToken,
      body: { status: 'rejected', teacherComment: '  ' },
    });
    assert.equal(status, 400);
  });

  test('студент не може перевіряти записи — 403', async () => {
    const { body: entries } = await api('GET', '/diaryEntries?assignmentId=2', { token: studentToken });
    const { status } = await api('PATCH', `/diaryEntries/${entries[0].id}`, {
      token: studentToken,
      body: { status: 'approved' },
    });
    assert.equal(status, 403);
  });
});

describe('Оцінювання практики', () => {
  test('оцінка до прийняття звіту — 409', async () => {
    const { status } = await api('POST', '/grades', {
      token: teacherToken,
      body: { assignmentId: 2, enterpriseGrade: 90, teacherGrade: 85, defenseDate: '2025-12-05' },
    });
    assert.equal(status, 409);
  });

  test('після прийняття звіту оцінка зберігається, бал і ECTS обчислює сервер', async () => {
    await api('PATCH', '/assignments/2', { token: teacherToken, body: { reportStatus: 'accepted' } });
    const { status, body } = await api('POST', '/grades', {
      token: teacherToken,
      body: { assignmentId: 2, enterpriseGrade: 90, teacherGrade: 85, defenseDate: '2025-12-05', finalScore: 100 },
    });
    assert.equal(status, 201);
    assert.equal(body.finalScore, 88, 'сервер рахує середнє сам і не бере finalScore із запиту');
    assert.equal(body.ectsGrade, 'B');
    assert.equal(body.nationalGrade, 'добре');
  });

  test('після виставлення оцінки направлення переходить у статус «захищено»', async () => {
    const { body } = await api('GET', '/assignments/2', { token: teacherToken });
    assert.equal(body.status, 'defended');
    assert.equal(body.grade.ectsGrade, 'B');
  });

  test('оцінка поза діапазоном 0–100 — 422', async () => {
    const { status, body } = await api('POST', '/grades', {
      token: teacherToken,
      body: { assignmentId: 2, enterpriseGrade: 150, teacherGrade: -5, defenseDate: '2025-12-05' },
    });
    assert.equal(status, 422);
    assert.ok(body.details.enterpriseGrade);
    assert.ok(body.details.teacherGrade);
  });

  test('студент не може виставити оцінку — 403', async () => {
    const { status } = await api('POST', '/grades', {
      token: studentToken,
      body: { assignmentId: 2, enterpriseGrade: 100, teacherGrade: 100, defenseDate: '2025-12-05' },
    });
    assert.equal(status, 403);
  });
});

describe('Бази практики', () => {
  let newId;

  test('створення бази практики — 201', async () => {
    const { status, body } = await api('POST', '/enterprises', {
      token: adminToken,
      body: { name: 'ТОВ «Тестова компанія»', address: 'м. Івано-Франківськ, вул. Тестова, 1', email: 'test@example.com' },
    });
    assert.equal(status, 201);
    assert.equal(body.isActive, true);
    newId = body.id;
  });

  test('коротка назва та некоректна пошта — 422', async () => {
    const { status, body } = await api('POST', '/enterprises', {
      token: adminToken,
      body: { name: 'ТО', address: 'Адреса', email: 'не-пошта' },
    });
    assert.equal(status, 422);
    assert.ok(body.details.name);
    assert.ok(body.details.email);
  });

  test('керівник не може створити базу практики — 403', async () => {
    const { status } = await api('POST', '/enterprises', {
      token: teacherToken,
      body: { name: 'ТОВ «Інша компанія»', address: 'Адреса' },
    });
    assert.equal(status, 403);
  });

  test('видалення бази, на яку є направлення, — 409', async () => {
    const { status } = await api('DELETE', '/enterprises/1', { token: adminToken });
    assert.equal(status, 409);
  });

  test('видалення бази без направлень — 204', async () => {
    const { status } = await api('DELETE', `/enterprises/${newId}`, { token: adminToken });
    assert.equal(status, 204);
  });

  test('неіснуюча база практики — 404', async () => {
    const { status } = await api('GET', '/enterprises/999', { token: adminToken });
    assert.equal(status, 404);
  });
});
