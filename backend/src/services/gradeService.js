// Бізнес-логіка оцінювання практики: розрахунок підсумкового балу та переведення у шкалу ECTS.
import { gradeModel } from '../models/gradeModel.js';
import { assignmentModel } from '../models/assignmentModel.js';
import { assignmentService } from './assignmentService.js';
import { ApiError } from '../utils/ApiError.js';
import { assertValid, validateGrade } from '../utils/validate.js';
import { GradeCalculator } from '../patterns/grades/GradeCalculator.js';

export const gradeService = {
  // Підсумковий бал обчислює сервер, а не клієнт, — інакше оцінку можна було б підмінити у запиті
  calculate(enterpriseGrade, teacherGrade, strategy) {
    // Стратегію передає серверний код; HTTP-запит її не обирає.
    return new GradeCalculator(strategy).calculate(enterpriseGrade, teacherGrade);
  },

  list(user, query = {}) {
    if (query.assignmentId) {
      const assignment = assignmentModel.findById(Number(query.assignmentId));
      if (!assignment) throw ApiError.notFound('Направлення не знайдено');
      assignmentService.assertCanView(user, assignment);
      return gradeModel.list({ assignmentId: Number(query.assignmentId) });
    }
    if (user.role === 'student') {
      return gradeModel.list().filter((g) => {
        const a = assignmentModel.findById(g.assignmentId);
        return a && a.studentId === user.studentId;
      });
    }
    return gradeModel.list();
  },

  // Виставлення оцінки: лише після прийняття звіту; направлення переходить у статус «Захищено»
  save(user, data, existingId = null) {
    if (user.role === 'student') throw ApiError.forbidden('Виставляти оцінку може лише керівник практики');

    const assignmentId = Number(data.assignmentId);
    const assignment = assignmentModel.findById(assignmentId);
    if (!assignment) throw ApiError.notFound('Направлення не знайдено');
    assignmentService.assertCanView(user, assignment);

    assertValid(validateGrade(data));
    if (assignment.reportStatus !== 'accepted') {
      throw ApiError.conflict('Оцінку можна виставити лише після прийняття звіту з практики');
    }

    // Офіційне збереження завжди використовує початкове округлене середнє.
    const calculated = this.calculate(data.enterpriseGrade, data.teacherGrade);
    const payload = {
      assignmentId,
      enterpriseGrade: Number(data.enterpriseGrade),
      teacherGrade: Number(data.teacherGrade),
      ...calculated,
      defenseDate: data.defenseDate,
      comment: data.comment,
    };

    const existing = existingId ? gradeModel.findById(existingId) : gradeModel.findByAssignment(assignmentId);
    const grade = existing ? gradeModel.update(existing.id, payload) : gradeModel.create(payload);

    assignmentModel.patch(assignmentId, { status: 'defended' });
    return grade;
  },
};
