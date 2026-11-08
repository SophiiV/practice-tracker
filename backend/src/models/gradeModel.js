// Модель оцінки за практику: таблиця grades.
import { all, get, run } from '../db.js';

const SQL = `
  SELECT id, assignment_id AS assignmentId,
         enterprise_grade AS enterpriseGrade, teacher_grade AS teacherGrade,
         final_score AS finalScore, ects_grade AS ectsGrade,
         national_grade AS nationalGrade, defense_date AS defenseDate, comment
  FROM grades`;

export const gradeModel = {
  list: ({ assignmentId } = {}) =>
    (assignmentId ? all(`${SQL} WHERE assignment_id = ?`, assignmentId) : all(`${SQL} ORDER BY defense_date`)),

  findById: (id) => get(`${SQL} WHERE id = ?`, id),
  findByAssignment: (assignmentId) => get(`${SQL} WHERE assignment_id = ?`, assignmentId),

  create: (d) => {
    const { lastInsertRowid } = run(
      `INSERT INTO grades (assignment_id, enterprise_grade, teacher_grade, final_score,
                           ects_grade, national_grade, defense_date, comment)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      d.assignmentId, d.enterpriseGrade, d.teacherGrade, d.finalScore,
      d.ectsGrade, d.nationalGrade, d.defenseDate, d.comment ?? null,
    );
    return gradeModel.findById(Number(lastInsertRowid));
  },

  update: (id, d) => {
    run(
      `UPDATE grades
       SET enterprise_grade = ?, teacher_grade = ?, final_score = ?,
           ects_grade = ?, national_grade = ?, defense_date = ?, comment = ?
       WHERE id = ?`,
      d.enterpriseGrade, d.teacherGrade, d.finalScore,
      d.ectsGrade, d.nationalGrade, d.defenseDate, d.comment ?? null, id,
    );
    return gradeModel.findById(id);
  },
};
