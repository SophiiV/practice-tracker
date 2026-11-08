// Модель користувача: робота з таблицями users, students, teachers.
// У базі поля названо у стилі snake_case, а клієнт очікує camelCase,
// тому кожна модель перетворює рядок таблиці на об'єкт для передавання (DTO).
import { all, get } from '../db.js';

// Скорочення ПІБ: «Пікуляк Микола Васильович» → «Пікуляк М. В.»
function shortName(fullName) {
  const [last, first, patronymic] = String(fullName).split(' ');
  return [last, first && first[0] + '.', patronymic && patronymic[0] + '.'].filter(Boolean).join(' ');
}

export const userModel = {
  findByEmail: (email) => get('SELECT * FROM users WHERE email = ?', email),
  findById: (id) => get('SELECT * FROM users WHERE id = ?', id),

  // Повертає дані користувача без хеша пароля разом з ідентифікатором профілю
  toDto(user) {
    if (!user) return null;
    const student = get('SELECT id FROM students WHERE user_id = ?', user.id);
    const teacher = get('SELECT id FROM teachers WHERE user_id = ?', user.id);
    return {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      studentId: student ? student.id : null,
      teacherId: teacher ? teacher.id : null,
    };
  },
};

const STUDENT_SQL = `
  SELECT s.id, u.full_name AS fullName, u.email, u.phone,
         s.group_name AS groupName, s.record_book_number AS recordBookNumber
  FROM students s JOIN users u ON u.id = s.user_id`;

export const studentModel = {
  list: ({ sort } = {}) => {
    const order = sort === 'fullName' ? ' ORDER BY u.full_name' : ' ORDER BY s.id';
    return all(STUDENT_SQL + order);
  },
  findById: (id) => get(`${STUDENT_SQL} WHERE s.id = ?`, id),
};

const TEACHER_SQL = `
  SELECT t.id, u.full_name AS fullName, u.email, t.department, t.position
  FROM teachers t JOIN users u ON u.id = t.user_id`;

export const teacherModel = {
  list: () => all(`${TEACHER_SQL} ORDER BY u.full_name`).map((t) => ({ ...t, shortName: shortName(t.fullName) })),
  findById: (id) => {
    const t = get(`${TEACHER_SQL} WHERE t.id = ?`, id);
    return t ? { ...t, shortName: shortName(t.fullName) } : undefined;
  },
};
