// Модальне вікно. Закривається кнопкою ×, кліком по затемненому фону або клавішею Escape.
import { useEffect } from 'react';
import styles from './Modal.module.css';

export default function Modal({ title, onClose, children, width = 560 }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden'; // блокуємо прокрутку сторінки під модалкою
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className={styles.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="modal-title" style={{ maxWidth: width }}>
        <div className={styles.head}>
          <h2 id="modal-title" className={styles.title}>{title}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Закрити">×</button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
