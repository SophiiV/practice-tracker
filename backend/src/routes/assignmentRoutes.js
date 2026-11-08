// Маршрути направлень на практику.
import { Router } from 'express';
import { assignmentService } from '../services/assignmentService.js';
import { authorize } from '../middleware/auth.js';

export const assignmentRoutes = Router();

// Список направлень відповідно до ролі користувача
assignmentRoutes.get('/', (req, res) => {
  res.json(assignmentService.list(req.user, req.query));
});

// Зведена статистика (окремий маршрут оголошено до '/:id',
// інакше Express сприйняв би слово «stats» як ідентифікатор)
assignmentRoutes.get('/stats', authorize('admin', 'teacher'), (req, res) => {
  res.json(assignmentService.stats());
});

// Одне направлення разом із кількістю годин та оцінкою
assignmentRoutes.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const assignment = assignmentService.getById(req.user, id);
  res.json({ ...assignment, totalHours: assignmentService.totalHours(id), grade: assignmentService.grade(id) });
});

// Створення направлення — лише адміністратор
assignmentRoutes.post('/', authorize('admin'), (req, res) => {
  res.status(201).json(assignmentService.create(req.body));
});

// Повне оновлення — лише адміністратор
assignmentRoutes.put('/:id', authorize('admin'), (req, res) => {
  res.json(assignmentService.update(Number(req.params.id), req.body));
});

// Часткове оновлення: статус, дані звіту
assignmentRoutes.patch('/:id', (req, res) => {
  res.json(assignmentService.patch(req.user, Number(req.params.id), req.body));
});

// Видалення — лише адміністратор; відповідь без тіла
assignmentRoutes.delete('/:id', authorize('admin'), (req, res) => {
  assignmentService.remove(Number(req.params.id));
  res.status(204).end();
});
