// Централізоване оброблення помилок.
// Будь-яка помилка з маршруту чи сервісу потрапляє сюди і перетворюється
// на відповідь однакового формату — клієнту не доводиться розбирати різні варіанти.
import { ApiError } from '../utils/ApiError.js';

// Маршрут не знайдено
export function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Маршрут ${req.method} ${req.originalUrl} не існує`));
}

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err.type === 'entity.parse.failed') return res.status(400).json({ status: 400, message: 'Некоректний JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ status: 413, message: 'Завеликий обсяг даних' });
  // Помилки, які ми кидаємо свідомо, мають власний статус
  if (err instanceof ApiError) {
    const body = { status: err.status, message: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }

  // Порушення обмежень бази даних перетворюємо на зрозумілі повідомлення
  const text = String(err.message || '');
  if (text.includes('UNIQUE constraint failed')) {
    return res.status(409).json({ status: 409, message: 'Запис із такими даними вже існує' });
  }
  if (text.includes('FOREIGN KEY constraint failed')) {
    return res.status(409).json({ status: 409, message: 'Неможливо виконати дію: запис пов’язаний з іншими даними' });
  }

  // Непередбачена помилка: подробиці пишемо в журнал сервера, а клієнту повертаємо загальне повідомлення
  console.error('[error]', err);
  res.status(500).json({ status: 500, message: 'Внутрішня помилка сервера' });
}
