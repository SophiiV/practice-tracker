// Допоміжні функції форматування.

// '2025-11-03' -> '03.11.2025'
export function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

// 'Василюк Софія Ярославівна' -> 'Василюк С. Я.'
export function shortName(fullName) {
  if (!fullName) return '';
  const [last, first, patronymic] = fullName.split(' ');
  return [last, first && first[0] + '.', patronymic && patronymic[0] + '.'].filter(Boolean).join(' ');
}

// Сьогоднішня дата у форматі ISO для <input type="date">
export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// Обмеження списку направлень за роллю: студент бачить лише свої,
// керівник — лише закріплених за ним студентів, адміністратор — усі
export function visibleForRole(assignments, user) {
  if (!assignments) return [];
  if (user.role === 'student') return assignments.filter((a) => a.studentId === user.studentId);
  if (user.role === 'teacher') return assignments.filter((a) => a.teacherId === user.teacherId);
  return assignments;
}
