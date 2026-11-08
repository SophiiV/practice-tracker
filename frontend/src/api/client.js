// Низькорівнева обгортка над fetch для роботи з REST API.
// Відповідає за: базовий URL, JSON-серіалізацію, передавання токена доступу,
// обробку HTTP-помилок та мережевих збоїв.
// Усі функції асинхронні та повертають Promise з уже розібраними даними (JSON).

const BASE_URL = '/api'; // проксіюється Vite на сервер (див. vite.config.js)
const TOKEN_KEY = 'practice-tracker.token';

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details; // перелік полів з помилками, якщо сервер його повернув
  }
}

// Токен зберігається у браузері, щоб не вводити пароль під час кожного запиту
export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (token) => { try { localStorage.setItem(TOKEN_KEY, token); } catch { /* приватний режим */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* приватний режим */ } },
};

async function request(path, { method = 'GET', body, query } = {}) {
  // Формуємо рядок запиту з об'єкта, пропускаючи порожні значення
  const qs = query
    ? '?' +
      Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&')
    : '';

  const token = tokenStore.get();
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}${qs}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // Сервер визначає користувача та його роль за цим токеном
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch кидає виняток лише при мережевій помилці (сервер недоступний, немає Інтернету)
    throw new ApiError('Не вдалося з\'єднатися з сервером. Перевірте, чи запущено сервер, та повторіть спробу.', 0);
  }

  if (!response.ok) {
    // Сервер повертає помилки в єдиному форматі { status, message, details }
    let payload = {};
    try { payload = await response.json(); } catch { /* тіло не JSON */ }

    // Термін дії токена минув — прибираємо його, щоб користувач увійшов заново
    if (response.status === 401) tokenStore.clear();

    const fallback = {
      400: 'Некоректний запит',
      401: 'Потрібна авторизація',
      403: 'Недостатньо прав для виконання дії',
      404: 'Запис не знайдено',
      409: 'Конфлікт даних',
      422: 'Некоректні дані',
      500: 'Внутрішня помилка сервера',
    };
    throw new ApiError(
      payload.message || fallback[response.status] || `Помилка запиту (${response.status})`,
      response.status,
      payload.details,
    );
  }

  // 204 No Content (напр. після DELETE) — тіла немає
  if (response.status === 204) return null;
  return response.json();
}

export const http = {
  get: (path, query) => request(path, { query }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};

// Для файлів не використовуємо JSON-парсер; токен передається так само, як в інших запитах.
export async function downloadDocument(path, filename) {
  let response;
  try { response = await fetch(`${BASE_URL}${path}`, { headers: { Authorization: `Bearer ${tokenStore.get()}` } }); }
  catch { throw new ApiError('Сервер недоступний. Повторіть завантаження.', 0); }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) tokenStore.clear();
    throw new ApiError(payload.message || 'Не вдалося завантажити файл', response.status, payload.details);
  }
  const blob = await response.blob(); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
