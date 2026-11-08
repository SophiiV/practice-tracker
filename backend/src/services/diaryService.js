// Бізнес-логіка щоденника практики.
import { diaryModel } from '../models/diaryModel.js';
import { assignmentModel } from '../models/assignmentModel.js';
import { periodModel } from '../models/enterpriseModel.js';
import { assignmentService } from './assignmentService.js';
import { ApiError } from '../utils/ApiError.js';
import { assertValid, validateDiaryEntry } from '../utils/validate.js';

export const diaryService = {
  // Записи конкретного направлення або останні записи для головної сторінки
  list(user, query = {}) {
    if (query.assignmentId) {
      const assignment = assignmentModel.findById(Number(query.assignmentId));
      if (!assignment) throw ApiError.notFound('Направлення не знайдено');
      assignmentService.assertCanView(user, assignment);
      return diaryModel.listByAssignment(Number(query.assignmentId), query._order);
    }
    const limit = Math.min(Number(query._limit) || 20, 100);
    const recent = diaryModel.listRecent(limit);
    // Користувач бачить лише ті записи, до направлень яких має доступ
    if (user.role === 'admin') return recent;
    const visible = new Set(assignmentService.list(user).map((a) => a.id));
    return recent.filter((e) => visible.has(e.assignmentId));
  },

  // Додати запис може лише студент — власник направлення, і лише поки практика триває
  create(user, data) {
    const assignment = assignmentModel.findById(Number(data.assignmentId));
    if (!assignment) throw ApiError.notFound('Направлення не знайдено');
    if (user.role !== 'student' || assignment.studentId !== user.studentId) {
      throw ApiError.forbidden('Вести щоденник може лише студент, якому належить направлення');
    }
    if (assignment.status === 'defended') {
      throw ApiError.conflict('Практику вже захищено — щоденник закрито для редагування');
    }

    const period = periodModel.rawById(assignment.periodId);
    assertValid(validateDiaryEntry(data, period));

    const entry = diaryModel.create({ ...data, assignmentId: assignment.id });
    // Перший запис означає, що студент розпочав практику
    if (assignment.status === 'assigned') assignmentModel.patch(assignment.id, { status: 'in_progress' });
    return entry;
  },

  // Перевірка запису керівником або адміністратором
  review(user, id, data) {
    const entry = diaryModel.findById(id);
    if (!entry) throw ApiError.notFound('Запис щоденника не знайдено');
    if (user.role === 'student') throw ApiError.forbidden('Перевіряти записи може лише керівник практики');

    const assignment = assignmentModel.findById(entry.assignmentId);
    assignmentService.assertCanView(user, assignment);

    if (!['approved', 'rejected'].includes(data.status)) {
      throw ApiError.badRequest('Статус запису має бути «approved» або «rejected»');
    }
    if (data.status === 'rejected' && !String(data.teacherComment ?? '').trim()) {
      throw ApiError.badRequest('Під час відхилення запису потрібно вказати зауваження');
    }
    return diaryModel.review(id, data.status, data.teacherComment);
  },
};
