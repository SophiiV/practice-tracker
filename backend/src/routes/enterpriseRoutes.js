// Маршрути баз практики.
import { Router } from 'express';
import { enterpriseModel } from '../models/enterpriseModel.js';
import { authorize } from '../middleware/auth.js';
import { ApiError } from '../utils/ApiError.js';
import { assertValid, validateEnterprise } from '../utils/validate.js';

export const enterpriseRoutes = Router();

enterpriseRoutes.get('/', (req, res) => {
  const isActive = req.query.isActive === undefined ? undefined : req.query.isActive !== 'false';
  res.json(enterpriseModel.list({ sort: req.query._sort, isActive }));
});

enterpriseRoutes.get('/:id', (req, res) => {
  const enterprise = enterpriseModel.findById(Number(req.params.id));
  if (!enterprise) throw ApiError.notFound('Базу практики не знайдено');
  res.json(enterprise);
});

enterpriseRoutes.post('/', authorize('admin'), (req, res) => {
  assertValid(validateEnterprise(req.body));
  res.status(201).json(enterpriseModel.create(req.body));
});

enterpriseRoutes.put('/:id', authorize('admin'), (req, res) => {
  const id = Number(req.params.id);
  if (!enterpriseModel.findById(id)) throw ApiError.notFound('Базу практики не знайдено');
  assertValid(validateEnterprise(req.body));
  res.json(enterpriseModel.update(id, req.body));
});

// Базу практики, на яку вже є направлення, видалити не можна —
// натомість її деактивують, щоб зберегти історію
enterpriseRoutes.delete('/:id', authorize('admin'), (req, res) => {
  const id = Number(req.params.id);
  if (!enterpriseModel.findById(id)) throw ApiError.notFound('Базу практики не знайдено');
  if (enterpriseModel.countAssignments(id) > 0) {
    throw ApiError.conflict('Базу практики не можна видалити: на неї вже є направлення');
  }
  enterpriseModel.remove(id);
  res.status(204).end();
});
