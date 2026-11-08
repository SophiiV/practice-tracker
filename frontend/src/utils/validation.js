// Валідація форм. Кожна функція повертає об'єкт помилок { поле: 'текст' };
// порожній об'єкт означає, що форма коректна.
import { formatDate } from './format.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+380\d{9}$/;

export function required(value, message = 'Поле обов\'язкове') {
  return value === undefined || value === null || String(value).trim() === '' ? message : '';
}

export function validateStudent(values) {
  const errors = {};
  errors.fullName = required(values.fullName) || (values.fullName.trim().split(/\s+/).length < 2 ? 'Вкажіть прізвище та ім\'я' : '');
  errors.email = required(values.email) || (!EMAIL_RE.test(values.email) ? 'Некоректний формат email' : '');
  errors.phone = values.phone && !PHONE_RE.test(values.phone) ? 'Формат: +380XXXXXXXXX' : '';
  errors.groupName = required(values.groupName);
  errors.recordBookNumber = required(values.recordBookNumber);
  return clean(errors);
}

export function validateEnterprise(values) {
  const errors = {};
  errors.name = required(values.name) || (values.name.trim().length < 3 ? 'Мінімум 3 символи' : '');
  errors.address = required(values.address);
  errors.email = values.email && !EMAIL_RE.test(values.email) ? 'Некоректний формат email' : '';
  errors.phone = values.phone && !PHONE_RE.test(values.phone) ? 'Формат: +380XXXXXXXXX' : '';
  errors.contractDate = values.contractDate && values.contractDate > todayIso() ? 'Дата не може бути в майбутньому' : '';
  return clean(errors);
}

export function validateAssignment(values) {
  const errors = {};
  errors.studentId = required(values.studentId, 'Оберіть студента');
  errors.periodId = required(values.periodId, 'Оберіть період практики');
  errors.enterpriseId = required(values.enterpriseId, 'Оберіть базу практики');
  errors.teacherId = required(values.teacherId, 'Оберіть керівника');
  errors.orderDate = values.orderDate && values.orderDate > todayIso() ? 'Дата наказу не може бути в майбутньому' : '';
  return clean(errors);
}

export function validateDiaryEntry(values, period) {
  const errors = {};
  errors.date = required(values.date, 'Вкажіть дату');
  if (!errors.date && period && (values.date < period.startDate || values.date > period.endDate)) {
    errors.date = `Дата має бути в межах практики (${formatDate(period.startDate)} – ${formatDate(period.endDate)})`;
  }
  const hours = Number(values.hours);
  errors.hours = required(values.hours, 'Вкажіть години') || (Number.isNaN(hours) || hours <= 0 || hours > 12 ? 'Від 1 до 12 годин' : '');
  errors.description = required(values.description, 'Опишіть виконану роботу') || (values.description.trim().length < 10 ? 'Мінімум 10 символів' : '');
  return clean(errors);
}

export function validateGrade(values) {
  const errors = {};
  const inRange = (v) => Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 100;
  errors.enterpriseGrade = required(values.enterpriseGrade) || (!inRange(values.enterpriseGrade) ? 'Ціле число 0–100' : '');
  errors.teacherGrade = required(values.teacherGrade) || (!inRange(values.teacherGrade) ? 'Ціле число 0–100' : '');
  errors.defenseDate = required(values.defenseDate, 'Вкажіть дату захисту');
  return clean(errors);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// Прибираємо порожні повідомлення, щоб Object.keys(errors).length === 0 означало «помилок немає»
function clean(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v));
}
