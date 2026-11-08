// Дрібні компоненти зворотного зв'язку: індикатор завантаження, помилка, порожній стан, toast.
// Реалізують принцип usability «видимість стану системи».
import styles from './Feedback.module.css';
import Button from './Button.jsx';

export function Loader({ text = 'Завантаження…' }) {
  return (
    <div className={styles.loader} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" /> {text}
    </div>
  );
}

export function ErrorMessage({ message, onRetry }) {
  return (
    <div className={styles.error} role="alert">
      <div>
        <strong>Не вдалося завантажити дані.</strong>
        <div className={styles.errorText}>{message}</div>
      </div>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Повторити</Button>}
    </div>
  );
}

export function EmptyState({ title = 'Нічого не знайдено', text, action }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon} aria-hidden="true">◌</div>
      <h3>{title}</h3>
      {text && <p className="muted">{text}</p>}
      {action}
    </div>
  );
}

export function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastOk}`} role="status">
      {toast.message}
    </div>
  );
}
