// Хук для короткочасних повідомлень (toast): «Запис збережено», «Помилка…».
import { useState, useCallback, useRef } from 'react';

export function useToast(timeout = 3000) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const show = useCallback((message, type = 'ok') => {
    clearTimeout(timer.current);
    setToast({ message, type });
    timer.current = setTimeout(() => setToast(null), timeout);
  }, [timeout]);
  return { toast, show };
}
