import { documentFields } from '../../../shared/documentFields.js';
export function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
export function validateDocument(kind, data, period, forExport = false) {
  const errors = {};
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { document: 'Очікується об’єкт документа' };
  const fields = documentFields[kind];
  for (const [key, label, max, required, type] of fields) {
    const v = data[key] ?? '';
    if (typeof v !== 'string') errors[key] = 'Очікується текст';
    else if (v.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v)) errors[key] = `Максимум ${max} символів без службових знаків`;
    else if (forExport && required && !v.trim()) errors[key] = `Заповніть поле «${label}»`;
    else if (v && type === 'date' && !isCalendarDate(v)) errors[key] = 'Вкажіть дійсну календарну дату';
    else if (v && type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors[key] = 'Некоректна електронна пошта';
    else if (key === 'course' && v && !/^[1-6]$/.test(v)) errors[key] = 'Курс від 1 до 6';
  }
  if (kind === 'contract' && isCalendarDate(data.validUntil) && ((isCalendarDate(data.signedOn) && data.validUntil < data.signedOn) || data.validUntil < period.endDate)) errors.validUntil = 'Строк договору не може завершуватися раніше підписання або завершення практики';
  if (kind === 'diary') {
    if (data.arrivedOn && data.departedOn && data.departedOn < data.arrivedOn) errors.departedOn = 'Дата вибуття має бути не раніше прибуття';
    const rows = data.schedule ?? [];
    if (!Array.isArray(rows) || rows.length > 48) errors.schedule = 'Не більше 48 пунктів графіка';
    else rows.forEach((r, i) => {
      if (!r || typeof r.title !== 'string' || !r.title.trim() || r.title.length > 180 || /[\x00-\x1f]/.test(r.title)) errors[`schedule.${i}.title`] = 'Назва роботи: від 1 до 180 символів';
      if (!r || !isCalendarDate(r.startDate) || !isCalendarDate(r.endDate) || r.startDate > r.endDate || r.startDate < period.startDate || r.endDate > period.endDate) errors[`schedule.${i}.dates`] = 'Дати роботи мають бути в межах практики, початок не пізніше кінця';
      if (r && typeof r.completed !== 'boolean') errors[`schedule.${i}.completed`] = 'Оберіть стан виконання';
    });
  }
  return errors;
}
