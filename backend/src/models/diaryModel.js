// Модель записів щоденника практики: таблиця diary_entries.
import { all, get, run } from '../db.js';

// У базі поле називається entry_date, а клієнт працює з полем date
const SQL = `
  SELECT id, assignment_id AS assignmentId, entry_date AS date,
         description, hours, status, teacher_comment AS teacherComment
  FROM diary_entries`;

export const diaryModel = {
  listByAssignment: (assignmentId, order = 'asc') =>
    all(`${SQL} WHERE assignment_id = ? ORDER BY entry_date ${order === 'desc' ? 'DESC' : 'ASC'}`, assignmentId),

  // Останні записи для головної сторінки
  listRecent: (limit = 20) => all(`${SQL} ORDER BY entry_date DESC, id DESC LIMIT ?`, limit),

  findById: (id) => get(`${SQL} WHERE id = ?`, id),

  create: (d) => {
    const { lastInsertRowid } = run(
      `INSERT INTO diary_entries (assignment_id, entry_date, description, hours, status, teacher_comment)
       VALUES (?, ?, ?, ?, 'submitted', NULL)`,
      d.assignmentId, d.date, String(d.description).trim(), Number(d.hours),
    );
    return diaryModel.findById(Number(lastInsertRowid));
  },

  // Перевірка запису керівником: змінюються лише статус і зауваження
  review: (id, status, teacherComment) => {
    run('UPDATE diary_entries SET status = ?, teacher_comment = ? WHERE id = ?', status, teacherComment ?? null, id);
    return diaryModel.findById(id);
  },

  totalHours: (assignmentId) =>
    get('SELECT COALESCE(SUM(hours), 0) AS total FROM diary_entries WHERE assignment_id = ?', assignmentId).total,
};
