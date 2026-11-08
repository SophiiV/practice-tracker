// Шар доступу до ресурсів REST API. Кожен ресурс — набір CRUD-функцій.
// Приховує від компонентів конкретні URL та параметри json-server (_expand, _embed, q).
import { http } from './client.js';

// Універсальна фабрика CRUD-операцій для простого ресурсу (/students, /enterprises ...)
function crud(resource) {
  return {
    list: (query) => http.get(`/${resource}`, query),
    get: (id) => http.get(`/${resource}/${id}`),
    create: (data) => http.post(`/${resource}`, data),
    update: (id, data) => http.put(`/${resource}/${id}`, data),
    patch: (id, data) => http.patch(`/${resource}/${id}`, data),
    remove: (id) => http.delete(`/${resource}/${id}`),
  };
}

export const api = {
  auth: {
    // Вхід: сервер перевіряє пароль і повертає токен доступу та дані користувача
    login: (email, password) => http.post('/auth/login', { email, password }),
    // Перевірка, що збережений токен ще дійсний
    me: () => http.get('/auth/me'),
  },
  students: crud('students'),
  teachers: crud('teachers'),
  enterprises: crud('enterprises'),
  periods: crud('periods'),
  grades: crud('grades'),

  assignments: {
    ...crud('assignments'),
    // Список направлень разом зі зв'язаними сутностями (json-server: _expand за полем *Id)
    listExpanded: (query) =>
      http.get('/assignments', { _expand: 'student', ...query }).then(async (rows) => {
        // json-server 0.17 підтримує лише один _expand через об'єкт query, тому решту підтягуємо окремо
        const [enterprises, teachers, periods] = await Promise.all([
          http.get('/enterprises'),
          http.get('/teachers'),
          http.get('/periods'),
        ]);
        const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
        const e = byId(enterprises), t = byId(teachers), p = byId(periods);
        return rows.map((a) => ({ ...a, enterprise: e[a.enterpriseId], teacher: t[a.teacherId], period: p[a.periodId] }));
      }),
    // Одне направлення з усіма деталями: студент, база, керівник, період, щоденник, оцінка
    getFull: async (id) => {
      const a = await http.get(`/assignments/${id}`);
      const [student, enterprise, teacher, period, diary, grades] = await Promise.all([
        http.get(`/students/${a.studentId}`),
        http.get(`/enterprises/${a.enterpriseId}`),
        http.get(`/teachers/${a.teacherId}`),
        http.get(`/periods/${a.periodId}`),
        http.get('/diaryEntries', { assignmentId: id, _sort: 'date', _order: 'asc' }),
        http.get('/grades', { assignmentId: id }),
      ]);
      return { ...a, student, enterprise, teacher, period, diary, grade: grades[0] || null };
    },
  },

  diaryEntries: {
    ...crud('diaryEntries'),
    listRecent: (limit = 5) => http.get('/diaryEntries', { _sort: 'date', _order: 'desc', _limit: limit }),
  },
};
