// Налаштування застосунку Express: проміжні обробники (middleware) та маршрути.
// Файл не запускає сервер — це дозволяє використовувати застосунок у тестах.
import express from 'express';
import { requestLogger } from './middleware/logger.js';
import { authenticate } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authRoutes } from './routes/authRoutes.js';
import { assignmentRoutes } from './routes/assignmentRoutes.js';
import { diaryRoutes } from './routes/diaryRoutes.js';
import { enterpriseRoutes } from './routes/enterpriseRoutes.js';
import { studentRoutes, teacherRoutes, periodRoutes, gradeRoutes } from './routes/referenceRoutes.js';

import { documentRoutes, materialRoutes } from './routes/documentRoutes.js';

export const app = express();

// Розбір тіла запиту у форматі JSON
app.use(express.json());
// Запис кожного запиту в журнал
app.use(requestLogger);

// Перевірка працездатності сервера — відкритий маршрут, корисний для діагностики
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
// Браузер автоматично запитує піктограму сайту; сервер даних не віддає — відповідаємо без тіла
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Вхід у систему не потребує токена
app.use('/auth', authRoutes);
app.use('/materials', materialRoutes);

// Усі наступні маршрути доступні лише з дійсним токеном
app.use(authenticate);
app.use('/documents', documentRoutes);
app.use('/assignments', assignmentRoutes);
app.use('/diaryEntries', diaryRoutes);
app.use('/enterprises', enterpriseRoutes);
app.use('/students', studentRoutes);
app.use('/teachers', teacherRoutes);
app.use('/periods', periodRoutes);
app.use('/grades', gradeRoutes);

// Обробники помилок підключаються останніми
app.use(notFoundHandler);
app.use(errorHandler);
