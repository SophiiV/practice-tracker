// Перевірка автентифікації та прав доступу.
// Виконується перед обробником кожного захищеного маршруту.
import { authService } from '../services/authService.js';
import { ApiError } from '../utils/ApiError.js';

// Автентифікація: читає токен із заголовка Authorization: Bearer <токен>
export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Відсутній токен доступу'));
  }
  try {
    const payload = authService.verifyToken(token);
    // Дані користувача зберігаємо у req — ними користуються сервіси
    req.user = { id: payload.sub, role: payload.role, studentId: payload.studentId, teacherId: payload.teacherId };
    next();
  } catch (err) {
    next(err);
  }
}

// Авторизація: пропускає далі лише користувачів із дозволеними ролями
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden('Недостатньо прав для виконання цієї дії'));
  }
  next();
};
