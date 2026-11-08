// Перевірка вхідних даних (валідація).
// Кожна функція повертає об'єкт помилок { поле: 'текст' }; порожній об'єкт означає, що дані коректні.
// Валідація виконується на сервері навіть тоді, коли така сама перевірка є на клієнті,
// бо клієнтський код можна обійти (наприклад, надіслати запит напряму).
import { ApiError } from './ApiError.js';

import { isCalendarDate } from './documentValidation.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isEmpty = (v) => v === undefined || v === null || String(v).trim() === '';

// Якщо є хоча б одна помилка — кидаємо 422 з переліком полів
export function assertValid(errors) {
  const clean = Object.fromEntries(Object.entries(errors).filter(([, v]) => v));
  if (Object.keys(clean).length > 0) {
    throw new ApiError(422, 'Некоректні дані', clean);
  }
}

export function validateLogin(body) {
  return {
    email: isEmpty(body.email) ? 'Вкажіть електронну пошту' : (!EMAIL_RE.test(body.email) ? 'Некоректний формат пошти' : ''),
    password: typeof body.password !== 'string' || isEmpty(body.password) ? 'Вкажіть пароль текстом' : '',
  };
}

export function validateEnterprise(body) {
  return {
    name: isEmpty(body.name) ? 'Вкажіть назву' : (String(body.name).trim().length < 3 ? 'Мінімум 3 символи' : ''),
    address: isEmpty(body.address) ? 'Вкажіть адресу' : '',
    email: !isEmpty(body.email) && !EMAIL_RE.test(body.email) ? 'Некоректний формат пошти' : '',
    contractDate: !isEmpty(body.contractDate) && !isCalendarDate(body.contractDate) ? 'Формат дати: РРРР-ММ-ДД' : '',
  };
}

export function validateAssignment(body) {
  const id = (v) => (isEmpty(v) || !Number.isInteger(Number(v)) || Number(v) <= 0);
  return {
    studentId: id(body.studentId) ? 'Оберіть студента' : '',
    periodId: id(body.periodId) ? 'Оберіть період практики' : '',
    enterpriseId: id(body.enterpriseId) ? 'Оберіть базу практики' : '',
    teacherId: id(body.teacherId) ? 'Оберіть керівника' : '',
    orderDate: !isEmpty(body.orderDate) && !isCalendarDate(body.orderDate) ? 'Формат дати: РРРР-ММ-ДД' : '',
  };
}

// period потрібен, щоб перевірити, що дата запису не виходить за межі практики
export function validateDiaryEntry(body, period) {
  const hours = Number(body.hours);
  const errors = {
    date: isEmpty(body.date) ? 'Вкажіть дату' : (!isCalendarDate(body.date) ? 'Формат дати: РРРР-ММ-ДД' : ''),
    hours: isEmpty(body.hours) ? 'Вкажіть кількість годин' : ((typeof body.hours !== 'number' && typeof body.hours !== 'string') || !Number.isFinite(hours) || hours <= 0 || hours > 12 ? 'Від 1 до 12 годин' : ''),
    description: isEmpty(body.description) ? 'Опишіть виконану роботу' : (String(body.description).trim().length < 10 ? 'Мінімум 10 символів' : ''),
  };
  if (!errors.date && period && (body.date < period.start_date || body.date > period.end_date)) {
    errors.date = `Дата має бути в межах практики (${period.start_date} – ${period.end_date})`;
  }
  return errors;
}

export function validateGrade(body) {
  const inRange = (v) => !isEmpty(v) && Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 100;
  return {
    enterpriseGrade: inRange(body.enterpriseGrade) ? '' : 'Ціле число від 0 до 100',
    teacherGrade: inRange(body.teacherGrade) ? '' : 'Ціле число від 0 до 100',
    defenseDate: isEmpty(body.defenseDate) ? 'Вкажіть дату захисту' : (!isCalendarDate(body.defenseDate) ? 'Формат дати: РРРР-ММ-ДД' : ''),
  };
}
