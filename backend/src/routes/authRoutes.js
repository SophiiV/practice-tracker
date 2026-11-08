// Маршрути автентифікації.
import { Router } from 'express';
import { authService } from '../services/authService.js';
import { authenticate } from '../middleware/auth.js';
import { assertValid, validateLogin } from '../utils/validate.js';

import { registerStudent } from '../services/registrationService.js';

export const authRoutes = Router();

// Вхід у систему: повертає токен доступу та дані користувача
authRoutes.post('/login', (req, res) => {
  assertValid(validateLogin(req.body));
  const result = authService.login(req.body.email, req.body.password);
  res.json(result);
});

// Дані поточного користувача (перевірка, що токен ще дійсний)
authRoutes.get('/me', authenticate, (req, res) => {
  res.json(authService.me(req.user.id));
});

authRoutes.post('/register', async (req, res, next) => {
  try { res.status(201).json(await registerStudent(req.body)); } catch (e) { next(e); }
});
