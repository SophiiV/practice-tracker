// Кольорова мітка статусу. Отримує словник (ASSIGNMENT_STATUS / ENTRY_STATUS) та код статусу.
import styles from './StatusBadge.module.css';

export default function StatusBadge({ dict, value }) {
  const meta = dict[value] || { label: value || '—', color: 'gray' };
  return <span className={`${styles.badge} ${styles[meta.color]}`}>{meta.label}</span>;
}
