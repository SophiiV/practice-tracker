// Маршрути щоденника практики.
import { Router } from 'express';
import { diaryService } from '../services/diaryService.js';

export const diaryRoutes = Router();

// Записи направлення або останні записи
diaryRoutes.get('/', (req, res) => {
  res.json(diaryService.list(req.user, req.query));
});

// Додати запис (студент — власник направлення)
diaryRoutes.post('/', (req, res) => {
  res.status(201).json(diaryService.create(req.user, req.body));
});

// Схвалити або відхилити запис (керівник, адміністратор)
diaryRoutes.patch('/:id', (req, res) => {
  res.json(diaryService.review(req.user, Number(req.params.id), req.body));
});
