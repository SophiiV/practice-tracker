// Перевіряємо патерни в справжньому сервісі, SQLite та HTTP, а не лише в демо.
// Кожен запуск має власну тимчасову БД; робоча database/practice.db не відкривається.
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { WeightedGradeStrategy } from '../src/patterns/grades/GradeStrategies.js';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'practice-patterns-'));
process.env.DB_PATH = path.join(temp, 'patterns.db');
process.env.JWT_SECRET = 'isolated-pattern-test-secret';
let db, server, base, student, teacher, gradeService, documentService;
const owner = { role: 'student', studentId: 1 };
const gradeInput = { assignmentId: 2, enterpriseGrade: 80, teacherGrade: 95, defenseDate: '2025-12-05' };
const contract = {
  number: 'PATTERN-12', city: 'Івано-Франківськ', signedOn: '2025-10-27',
  enterpriseName: 'ТОВ «Патерни»', representative: 'Директор Петренко Іван',
  authority: 'Статуту', address: 'м. Івано-Франківськ, вул. Тестова, 12',
  email: 'patterns@example.com', course: '4', specialty: 'Інженерія програмного забезпечення',
  validUntil: '2025-12-31', additionalTerms: 'Factory <Method> & Strategy',
};
const schedule = [{ title: 'Патерни <API> & перевірка', startDate: '2025-11-03', endDate: '2025-11-28', completed: true }];

async function request(method, url, body, token = student) {
  const response = await fetch(base + url, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

before(async () => {
  ({ db } = await import('../src/db.js'));
  ({ gradeService } = await import('../src/services/gradeService.js'));
  ({ documentService } = await import('../src/services/documentService.js'));
  const { app } = await import('../src/app.js');
  server = app.listen(0, '127.0.0.1');
  // Помилка listen відхиляє hook одразу, замість нескінченного очікування.
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  base = `http://127.0.0.1:${server.address().port}`;
  student = (await request('POST', '/auth/login', { email: 'sofiia.vasyliuk.23@pnu.edu.ua', password: 'praktyka2026' }, null)).body.token;
  teacher = (await request('POST', '/auth/login', { email: 'mykola.pikuliak@cnu.edu.ua', password: 'praktyka2026' }, null)).body.token;
  assert.ok(student && teacher);
});

after(async () => {
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  db?.close();
  fs.rmSync(temp, { recursive: true, force: true });
});

test('PI-01: gradeService приймає стратегію для розрахунку, не змінюючи БД і дефолт', () => {
  const before = db.prepare('SELECT * FROM grades').all();
  assert.equal(gradeService.calculate(80, 95, new WeightedGradeStrategy()).finalScore, 89);
  assert.equal(gradeService.calculate(80, 95).finalScore, 88);
  assert.deepEqual(db.prepare('SELECT * FROM grades').all(), before);
});

test('PI-02: до прийняття звіту HTTP зберігає 409 і не створює оцінку', async () => {
  const result = await request('POST', '/grades', gradeInput, teacher);
  assert.equal(result.status, 409);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM grades WHERE assignment_id=2').get().n, 0);
});

test('PI-03: HTTP зберігає середнє, ігнорує підміну формули та змінює статус направлення', async () => {
  assert.equal((await request('PATCH', '/assignments/2', { reportStatus: 'accepted' }, teacher)).status, 200);
  const result = await request('POST', '/grades', {
    ...gradeInput, strategy: 'weighted', enterpriseWeight: 0.4, teacherWeight: 0.6, finalScore: 100,
  }, teacher);
  assert.equal(result.status, 201);
  assert.equal(result.body.finalScore, 88);
  assert.equal(result.body.ectsGrade, 'B');
  assert.equal(db.prepare('SELECT final_score FROM grades WHERE assignment_id=2').get().final_score, 88);
  assert.equal(db.prepare('SELECT status FROM assignments WHERE id=2').get().status, 'defended');
});

test('PI-04: студент не може змінити оцінку через HTTP', async () => {
  const before = db.prepare('SELECT * FROM grades WHERE assignment_id=2').get();
  assert.equal((await request('POST', '/grades', { ...gradeInput, teacherGrade: 100 })).status, 403);
  assert.deepEqual(db.prepare('SELECT * FROM grades WHERE assignment_id=2').get(), before);
});

test('PI-05: обидва типи повертають початкові поля і defaults через сервіс та HTTP', async () => {
  const draft = (await request('GET', '/documents/2/contract')).body;
  assert.deepEqual(draft, {
    number: '', city: 'Івано-Франківськ', signedOn: '', enterpriseName: 'ТОВ «СофтСерв Україна»',
    representative: '', authority: '', address: 'м. Івано-Франківськ, вул. Незалежності, 67',
    email: 'hr@softserve.example', course: '4', specialty: '112 – «Інженерія програмного забезпечення»',
    validUntil: '', additionalTerms: '',
  });
  const diary = documentService.get(owner, 2, 'diary');
  assert.deepEqual(diary, {
    faculty: 'Факультет математики та інформатики', department: 'Інформаційних технологій',
    qualification: 'Бакалавр', educationProgram: 'Інженерія програмного забезпечення',
    specialty: 'Інженерія програмного забезпечення', course: '4', arrivedOn: '', departedOn: '',
    responsiblePerson: 'Гринів Олег Романович', schedule: [],
  });
  assert.deepEqual((await request('GET', '/documents/2/diary')).body, diary);
});

test('PI-06: get/save проходять Creator і зберігають договір, метадані та графік у SQLite', async () => {
  assert.equal((await request('PUT', '/documents/2/contract', contract)).status, 200);
  const diary = documentService.get(owner, 2, 'diary');
  assert.equal((await request('PUT', '/documents/2/diary', {
    ...diary, arrivedOn: '2025-11-03', departedOn: '2025-11-28', schedule,
  })).status, 200);
  assert.equal((await request('GET', '/documents/2/contract')).body.number, contract.number);
  assert.deepEqual((await request('GET', '/documents/2/diary')).body.schedule, schedule);
  assert.equal(db.prepare('SELECT number FROM practice_contracts WHERE assignment_id=2').get().number, contract.number);
  assert.equal(db.prepare('SELECT title FROM diary_schedule WHERE assignment_id=2').get().title, schedule[0].title);
});

test('PI-07: авторизація та доступ до документів збережені для обох продуктів', async () => {
  for (const kind of ['contract', 'diary']) {
    assert.equal((await request('GET', `/documents/2/${kind}`, undefined, null)).status, 401);
    assert.equal((await request('GET', `/documents/4/${kind}`)).status, 403);
    assert.equal((await request('PUT', `/documents/4/${kind}`, {})).status, 403);
    assert.equal((await request('GET', `/documents/2/${kind}`, undefined, teacher)).status, 200);
    assert.equal((await request('PUT', `/documents/2/${kind}`, {}, teacher)).status, 403);
  }
});

test('PI-08: неповний експорт, невідомий тип і відсутнє направлення зберігають статуси', async () => {
  const incomplete = await request('GET', '/documents/1/contract/download');
  assert.equal(incomplete.status, 422);
  assert.ok(incomplete.body.details.number);
  assert.equal((await request('GET', '/documents/2/unknown')).status, 404);
  assert.equal((await request('GET', '/documents/999/contract')).status, 404);
});

async function exportedText(kind) {
  const response = await fetch(`${base}/documents/2/${kind}/download`, { headers: { Authorization: `Bearer ${student}` } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /wordprocessingml/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const buffer = Buffer.from(await response.arrayBuffer());
  assert.equal(buffer.subarray(0, 2).toString(), 'PK');
  // Перевіряємо XML і всі незмінні ZIP-частини, а не лише сигнатуру файлу.
  const checked = spawnSync(process.env.PYTHON_BIN || 'python3', ['-c', `
import sys, io, zipfile, xml.etree.ElementTree as ET
from pathlib import Path
generated = zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))
source = zipfile.ZipFile(Path(sys.argv[1]))
assert generated.namelist() == source.namelist()
for name in source.namelist():
    if name != 'word/document.xml': assert generated.read(name) == source.read(name), name
xml = ET.fromstring(generated.read('word/document.xml'))
print(''.join(xml.itertext()))
`, fileURLToPath(new URL(`../templates/${kind}.docx`, import.meta.url))], { input: buffer, encoding: 'utf8' });
  assert.equal(checked.status, 0, checked.stderr);
  return checked.stdout;
}

test('PI-09: договір після Factory Method експортується з реквізитами й оригінальними ZIP-частинами', async () => {
  const text = await exportedText('contract');
  assert.ok(text.includes(contract.number));
  assert.ok(text.includes(contract.additionalTerms));
  assert.ok(text.includes('Василюк Софія Ярославівна'));
});

test('PI-10: щоденник після Factory Method містить графік, записи й оригінальні ZIP-частини', async () => {
  const text = await exportedText('diary');
  assert.ok(text.includes(schedule[0].title));
  assert.ok(text.includes('Інструктаж з техніки безпеки. Знайомство з командою та проєктом.'));
  assert.ok(text.includes('Василюк Софія Ярославівна'));
});

test('PI-11: помилка валідації через Product не перезаписує попередній графік', async () => {
  const result = await request('PUT', '/documents/2/diary', { schedule: [{ ...schedule[0], startDate: '2024-01-01' }] });
  assert.equal(result.status, 422);
  assert.ok(result.body.details['schedule.0.dates']);
  assert.deepEqual((await request('GET', '/documents/2/diary')).body.schedule, schedule);
});
