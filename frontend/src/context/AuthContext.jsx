// Контекст автентифікації. Зберігає поточного користувача та його роль.
// Вхід виконується на сервері: той перевіряє пароль і повертає токен доступу,
// який далі додається до кожного запиту (див. api/client.js).
import { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../api/resources.js';
import { tokenStore } from '../api/client.js';

const AuthContext = createContext(null);
const USER_KEY = 'practice-tracker.user';

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw && tokenStore.get() ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  // Вхід: надсилаємо пошту й пароль на сервер, зберігаємо отриманий токен
  const login = useCallback(async (email, password) => {
    const { token, user: loggedUser } = await api.auth.login(email.trim(), password);
    tokenStore.set(token);
    try { localStorage.setItem(USER_KEY, JSON.stringify(loggedUser)); } catch { /* приватний режим */ }
    setUser(loggedUser);
    return loggedUser;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    try { localStorage.removeItem(USER_KEY); } catch { /* приватний режим */ }
    setUser(null);
  }, []);

  // Перевірка прав за роллю: приховує недоступні дії в інтерфейсі.
  // Справжня перевірка прав виконується на сервері для кожного запиту.
  const can = useCallback(
    (action) => {
      if (!user) return false;
      const rules = {
        manage: ['admin'],              // довідники, направлення
        review: ['teacher', 'admin'],   // перевірка щоденника, звіту, оцінка
        writeDiary: ['student'],        // ведення власного щоденника
      };
      return (rules[action] || []).includes(user.role);
    },
    [user],
  );

  return <AuthContext.Provider value={{ user, login, logout, can }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth можна викликати лише всередині <AuthProvider>');
  return ctx;
}
