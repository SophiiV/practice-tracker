// Бізнес-логіка направлень на практику: права доступу, обмеження предметної області,
// статуси та робота зі звітом.
import { assignmentModel } from '../models/assignmentModel.js';
import { diaryModel } from '../models/diaryModel.js';
import { gradeModel } from '../models/gradeModel.js';
import { studentModel, teacherModel } from '../models/userModel.js';
import { enterpriseModel, periodModel } from '../models/enterpriseModel.js';
import { ApiError } from '../utils/ApiError.js';
import { assertValid, validateAssignment } from '../utils/validate.js';

// Допустимі статуси направлення
const STATUSES = ['assigned', 'in_progress', 'report_submitted', 'defended'];

export const assignmentService = {
  // Список направлень з урахуванням ролі:
  // студент бачить лише свої, керівник — лише закріплених за ним студентів, адміністратор — усі.
  // Обмеження накладається на сервері, тому його неможливо обійти з боку клієнта.
  list(user, query = {}) {
    const filter = {};
    if (user.role === 'student') filter.studentId = user.studentId;
    if (user.role === 'teacher') filter.teacherId = user.teacherId;
    if (query.periodId) filter.periodId = Number(query.periodId);

    const rows = assignmentModel.list(filter);
    // Параметр _expand=student додає до кожного направлення дані студента —
    // так клієнт отримує готовий список одним запитом, без додаткових звернень
    if (query._expand === 'student') {
      return rows.map((a) => ({ ...a, student: studentModel.findById(a.studentId) ?? null }));
    }
    return rows;
  },

  // Одне направлення; перевіряємо, що користувач має право його бачити
  getById(user, id) {
    const assignment = assignmentModel.findById(id);
    if (!assignment) throw ApiError.notFound('Направлення не знайдено');
    this.assertCanView(user, assignment);
    return assignment;
  },

  assertCanView(user, assignment) {
    if (user.role === 'admin') return;
    if (user.role === 'student' && assignment.studentId === user.studentId) return;
    if (user.role === 'teacher' && assignment.teacherId === user.teacherId) return;
    throw ApiError.forbidden('Ви не маєте доступу до цього направлення');
  },

  // Перевірка, що всі вказані довідникові записи існують, і що студент
  // ще не має направлення на цей самий період
  validateReferences(data, exceptId = 0) {
    assertValid(validateAssignment(data));
    const errors = {};
    if (!studentModel.findById(Number(data.studentId))) errors.studentId = 'Студента не знайдено';
    if (!periodModel.findById(Number(data.periodId))) errors.periodId = 'Період практики не знайдено';
    if (!teacherModel.findById(Number(data.teacherId))) errors.teacherId = 'Керівника не знайдено';
    const enterprise = enterpriseModel.findById(Number(data.enterpriseId));
    if (!enterprise) errors.enterpriseId = 'Базу практики не знайдено';
    else if (!enterprise.isActive) errors.enterpriseId = 'Базу практики деактивовано';
    if (data.status && !STATUSES.includes(data.status)) errors.status = 'Невідомий статус';
    assertValid(errors);

    if (assignmentModel.findDuplicate(Number(data.studentId), Number(data.periodId), exceptId)) {
      throw ApiError.conflict('Цей студент уже має направлення на обраний період практики');
    }
  },

  create(data) {
    this.validateReferences(data);
    return assignmentModel.create({
      ...data,
      studentId: Number(data.studentId),
      periodId: Number(data.periodId),
      enterpriseId: Number(data.enterpriseId),
      teacherId: Number(data.teacherId),
    });
  },

  update(id, data) {
    if (!assignmentModel.findById(id)) throw ApiError.notFound('Направлення не знайдено');
    this.validateReferences(data, id);
    return assignmentModel.update(id, {
      ...data,
      studentId: Number(data.studentId),
      periodId: Number(data.periodId),
      enterpriseId: Number(data.enterpriseId),
      teacherId: Number(data.teacherId),
    });
  },

  // Часткова зміна. Студент може лише подати звіт до власного направлення,
  // керівник — перевірити звіт, адміністратор — змінити будь-що.
  patch(user, id, data) {
    const assignment = assignmentModel.findById(id);
    if (!assignment) throw ApiError.notFound('Направлення не знайдено');
    this.assertCanView(user, assignment);

    if (data.status && !STATUSES.includes(data.status)) {
      throw ApiError.badRequest('Невідомий статус направлення');
    }
    if (user.role === 'student') {
      if (data.status && data.status !== 'report_submitted') throw ApiError.forbidden('Статус захисту визначає керівник після оцінювання');
      if (assignment.status === 'defended') throw ApiError.conflict('Практику вже захищено');
      if (data.status === 'report_submitted' && (!String(data.reportFileName || '').trim() || data.reportStatus !== 'submitted')) throw ApiError.badRequest('Для подання звіту вкажіть назву файлу і статус submitted');
      const allowed = ['reportFileName', 'reportSubmittedAt', 'reportStatus', 'status'];
      const extra = Object.keys(data).filter((k) => !allowed.includes(k));
      if (extra.length > 0) throw ApiError.forbidden('Студент може змінювати лише дані власного звіту');
      if (data.reportStatus && data.reportStatus !== 'submitted') {
        throw ApiError.forbidden('Статус звіту визначає керівник практики');
      }
    }
    return assignmentModel.patch(id, data);
  },

  remove(id) {
    if (!assignmentModel.findById(id)) throw ApiError.notFound('Направлення не знайдено');
    // Записи щоденника та оцінка видаляються автоматично завдяки ON DELETE CASCADE
    assignmentModel.remove(id);
  },

  // Зведені показники для головної сторінки
  stats() {
    const byStatus = Object.fromEntries(assignmentModel.countByStatus().map((r) => [r.status, r.count]));
    return {
      total: Object.values(byStatus).reduce((sum, n) => sum + n, 0),
      byStatus: Object.fromEntries(STATUSES.map((s) => [s, byStatus[s] || 0])),
      teacherWorkload: assignmentModel.teacherWorkload(),
      recentEntries: diaryModel.listRecent(6),
    };
  },

  // Довідкова інформація, яку показує картка направлення
  totalHours: (id) => diaryModel.totalHours(id),
  grade: (id) => gradeModel.findByAssignment(id) ?? null,
};
