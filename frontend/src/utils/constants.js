// Довідники, що використовуються в інтерфейсі: статуси, ролі, підписи.

export const ASSIGNMENT_STATUS = {
  assigned: { label: 'Направлено', color: 'gray' },
  in_progress: { label: 'Проходить практику', color: 'blue' },
  report_submitted: { label: 'Звіт подано', color: 'orange' },
  defended: { label: 'Захищено', color: 'green' },
};

export const ENTRY_STATUS = {
  draft: { label: 'Чернетка', color: 'gray' },
  submitted: { label: 'На перевірці', color: 'orange' },
  approved: { label: 'Схвалено', color: 'green' },
  rejected: { label: 'Відхилено', color: 'red' },
};

export const REPORT_STATUS = {
  submitted: { label: 'Подано, очікує перевірки', color: 'orange' },
  needs_revision: { label: 'Потребує доопрацювання', color: 'red' },
  accepted: { label: 'Прийнято', color: 'green' },
};

export const ROLE_LABEL = {
  admin: 'адміністратор',
  teacher: 'керівник практики',
  student: 'студент',
};

export const ECTS_SCALE = [
  { min: 90, ects: 'A', national: 'відмінно' },
  { min: 80, ects: 'B', national: 'добре' },
  { min: 70, ects: 'C', national: 'добре' },
  { min: 60, ects: 'D', national: 'задовільно' },
  { min: 50, ects: 'E', national: 'задовільно' },
  { min: 35, ects: 'FX', national: 'незадовільно' },
  { min: 0, ects: 'F', national: 'незадовільно' },
];

export function scoreToGrade(score) {
  return ECTS_SCALE.find((row) => score >= row.min);
}
