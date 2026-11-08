// Запуск сервера.
import { app } from './app.js';
import { config } from './config.js';

app.listen(config.port, () => {
  console.log(`[server] «Трекер Практики» — сервер запущено: http://localhost:${config.port}`);
  console.log('[server] перевірка працездатності: GET /health');
});
