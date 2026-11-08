// Маршрути довідників: студенти, викладачі, періоди практики, оцінки.
import { Router } from 'express';
import { studentModel, teacherModel } from '../models/userModel.js';
import { periodModel } from '../models/enterpriseModel.js';
import { gradeService } from '../services/gradeService.js';
import { authorize } from '../middleware/auth.js';
import { ApiError } from '../utils/ApiError.js';

export const studentRoutes = Router();

// Перелік студентів потрібен адміністратору для створення направлень,
// а керівникам — для перегляду; студент бачить лише власні дані
studentRoutes.get('/', authorize('admin', 'teacher'), (req, res) => {
  res.json(studentModel.list({ sort: req.query._sort }));
});

studentRoutes.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (req.user.role === 'student' && req.user.studentId !== id) {
    throw ApiError.forbidden('Доступ лише до власних даних');
  }
  const student = studentModel.findById(id);
  if (!student) throw ApiError.notFound('Студента не знайдено');
  res.json(student);
});

export const teacherRoutes = Router();

teacherRoutes.get('/', (req, res) => res.json(teacherModel.list()));

teacherRoutes.get('/:id', (req, res) => {
  const teacher = teacherModel.findById(Number(req.params.id));
  if (!teacher) throw ApiError.notFound('Викладача не знайдено');
  res.json(teacher);
});

export const periodRoutes = Router();

periodRoutes.get('/', (req, res) => res.json(periodModel.list()));

periodRoutes.get('/:id', (req, res) => {
  const period = periodModel.findById(Number(req.params.id));
  if (!period) throw ApiError.notFound('Період практики не знайдено');
  res.json(period);
});

export const gradeRoutes = Router();

gradeRoutes.get('/', (req, res) => res.json(gradeService.list(req.user, req.query)));

gradeRoutes.post('/', (req, res) => {
  res.status(201).json(gradeService.save(req.user, req.body));
});

gradeRoutes.put('/:id', (req, res) => {
  res.json(gradeService.save(req.user, req.body, Number(req.params.id)));
});
