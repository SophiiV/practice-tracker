// Модель направлення на практику: таблиця assignments.
import { all, get, run } from '../db.js';

const SQL = `
  SELECT a.id,
         a.student_id    AS studentId,
         a.period_id     AS periodId,
         a.enterprise_id AS enterpriseId,
         a.teacher_id    AS teacherId,
         a.supervisor_name AS supervisorName,
         a.order_number  AS orderNumber,
         a.order_date    AS orderDate,
         a.status,
         a.report_file_name    AS reportFileName,
         a.report_submitted_at AS reportSubmittedAt,
         a.report_status       AS reportStatus
  FROM assignments a`;

export const assignmentModel = {
  // Фільтри застосовуються лише тоді, коли передані, — тому один запит
  // обслуговує і список для адміністратора, і список «своїх» для студента чи керівника
  list: ({ studentId, teacherId, periodId } = {}) => {
    const where = [];
    const params = [];
    if (studentId) { where.push('a.student_id = ?'); params.push(studentId); }
    if (teacherId) { where.push('a.teacher_id = ?'); params.push(teacherId); }
    if (periodId) { where.push('a.period_id = ?'); params.push(periodId); }
    const sql = SQL + (where.length ? ` WHERE ${where.join(' AND ')}` : '') + ' ORDER BY a.id';
    return all(sql, ...params);
  },

  findById: (id) => get(`${SQL} WHERE a.id = ?`, id),

  // Чи існує вже направлення цього студента на цей період (обмеження «один студент — один період»)
  findDuplicate: (studentId, periodId, exceptId = 0) =>
    get('SELECT id FROM assignments WHERE student_id = ? AND period_id = ? AND id <> ?', studentId, periodId, exceptId),

  create: (d) => {
    const { lastInsertRowid } = run(
      `INSERT INTO assignments (student_id, period_id, enterprise_id, teacher_id,
                                supervisor_name, order_number, order_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      d.studentId, d.periodId, d.enterpriseId, d.teacherId,
      d.supervisorName ?? null, d.orderNumber ?? null, d.orderDate || null, d.status || 'assigned',
    );
    return assignmentModel.findById(Number(lastInsertRowid));
  },

  update: (id, d) => {
    run(
      `UPDATE assignments
       SET student_id = ?, period_id = ?, enterprise_id = ?, teacher_id = ?,
           supervisor_name = ?, order_number = ?, order_date = ?, status = ?
       WHERE id = ?`,
      d.studentId, d.periodId, d.enterpriseId, d.teacherId,
      d.supervisorName ?? null, d.orderNumber ?? null, d.orderDate || null, d.status || 'assigned', id,
    );
    return assignmentModel.findById(id);
  },

  // Часткове оновлення: змінюються лише ті поля, які передано у запиті
  patch: (id, d) => {
    const map = {
      status: 'status',
      reportFileName: 'report_file_name',
      reportSubmittedAt: 'report_submitted_at',
      reportStatus: 'report_status',
      supervisorName: 'supervisor_name',
      orderNumber: 'order_number',
      orderDate: 'order_date',
    };
    const sets = [];
    const params = [];
    for (const [key, column] of Object.entries(map)) {
      if (d[key] !== undefined) { sets.push(`${column} = ?`); params.push(d[key]); }
    }
    if (sets.length > 0) run(`UPDATE assignments SET ${sets.join(', ')} WHERE id = ?`, ...params, id);
    return assignmentModel.findById(id);
  },

  remove: (id) => run('DELETE FROM assignments WHERE id = ?', id),

  // Статистика для головної сторінки
  countByStatus: () => all('SELECT status, COUNT(*) AS count FROM assignments GROUP BY status'),
  teacherWorkload: () => all(`
    SELECT t.id AS teacherId, u.full_name AS teacher, COUNT(a.id) AS students
    FROM teachers t
    JOIN users u ON u.id = t.user_id
    LEFT JOIN assignments a ON a.teacher_id = t.id
    GROUP BY t.id ORDER BY students DESC`),
};
