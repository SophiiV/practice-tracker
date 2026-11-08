// Користувацький хук для завантаження даних з API.
// Інкапсулює типовий стан асинхронного запиту: data / loading / error,
// а також функцію reload() для повторного запиту після зміни даних (створення, видалення).
import { useState, useEffect, useCallback } from 'react';

export function useFetch(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0); // лічильник для примусового перезавантаження

  useEffect(() => {
    let cancelled = false; // захист від оновлення стану після демонтажу компонента
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => { if (!cancelled) setData(result); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Помилка завантаження'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, loading, error, reload, setData };
}
