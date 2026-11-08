// Ведення журналу подій: кожен запит записується у консоль сервера
// із методом, адресою, кодом відповіді та часом оброблення.
export function requestLogger(req, res, next) {
  const started = Date.now();
  res.on('finish', () => {
    const time = new Date().toLocaleTimeString('uk-UA');
    console.log(`[${time}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - started} мс)`);
  });
  next();
}
