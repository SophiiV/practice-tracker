// Поле форми: підпис, елемент введення (input / select / textarea) та повідомлення про помилку.
// Помилка показується лише після того, як користувач «торкнувся» поля або натиснув «Зберегти».
import styles from './FormField.module.css';

export default function FormField({ label, name, error, required, as = 'input', children, hint, ...rest }) {
  const Tag = as;
  const id = `field-${name}`;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}{required && <span className={styles.req}> *</span>}
      </label>
      <Tag
        id={id}
        name={name}
        className={`${styles.control} ${error ? styles.invalid : ''}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...rest}
      >
        {children}
      </Tag>
      {error ? (
        <div id={`${id}-error`} className={styles.error} role="alert">⚠ {error}</div>
      ) : hint ? (
        <div className={styles.hint}>{hint}</div>
      ) : null}
    </div>
  );
}
