// Картка показника на головній панелі.
import styles from './StatCard.module.css';

export default function StatCard({ value, label, tone = 'blue' }) {
  return (
    <div className={`card ${styles.card} ${styles[tone]}`}>
      <div className={styles.value}>{value}</div>
      <div className={styles.label}>{label}</div>
    </div>
  );
}
