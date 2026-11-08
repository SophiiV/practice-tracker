// Картка бази практики (використовується і на десктопі, і на мобільному — сітка адаптується).
import Button from '../ui/Button.jsx';
import { formatDate } from '../../utils/format.js';
import styles from './EnterpriseCard.module.css';

export default function EnterpriseCard({ item: e, studentsCount, canManage, onEdit, onDelete }) {
  return (
    <article className={`card ${styles.card} ${!e.isActive ? styles.inactive : ''}`}>
      <div className={styles.head}>
        <h3 className={styles.name}>{e.name}</h3>
        {!e.isActive && <span className={styles.tag}>неактивна</span>}
      </div>
      <div className="muted">{e.address}</div>
      <div className={styles.meta}>
        {e.phone && <span>☎ {e.phone}</span>}
        {e.email && <span>✉ {e.email}</span>}
      </div>
      <div className={styles.meta}>
        <span>Договір: {e.contractNumber || '—'}{e.contractDate ? ` від ${formatDate(e.contractDate)}` : ''}</span>
        <span>Студентів: {studentsCount}</span>
      </div>
      {canManage && (
        <div className="row" style={{ marginTop: '0.6rem' }}>
          <Button size="sm" variant="secondary" onClick={() => onEdit(e)}>✎ Редагувати</Button>
          <Button size="sm" variant="danger" onClick={() => onDelete(e)} disabled={studentsCount > 0} title={studentsCount > 0 ? 'Неможливо видалити: є направлення' : ''}>🗑 Видалити</Button>
        </div>
      )}
    </article>
  );
}
