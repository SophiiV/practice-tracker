// Картка направлення (мобільна версія — замість рядка таблиці).
import { Link } from 'react-router-dom';
import StatusBadge from '../ui/StatusBadge.jsx';
import Button from '../ui/Button.jsx';
import { ASSIGNMENT_STATUS } from '../../utils/constants.js';
import styles from './AssignmentCard.module.css';

export default function AssignmentCard({ item: a, canManage, onEdit, onDelete }) {
  return (
    <article className={`card ${styles.card}`}>
      <div className={styles.title}>{a.student?.fullName}</div>
      <div className="muted">{a.student?.groupName} · {a.enterprise?.name}</div>
      <div className="muted">Керівник: {a.teacher?.shortName}</div>
      <div className={styles.footer}>
        <StatusBadge dict={ASSIGNMENT_STATUS} value={a.status} />
        <div className="row" style={{ gap: '0.35rem' }}>
          <Link to={`/assignments/${a.id}`}><Button size="sm" variant="ghost">Детальніше</Button></Link>
          {canManage && <Button size="sm" variant="secondary" onClick={() => onEdit(a)} aria-label="Редагувати">✎</Button>}
          {canManage && <Button size="sm" variant="danger" onClick={() => onDelete(a)} aria-label="Видалити">🗑</Button>}
        </div>
      </div>
    </article>
  );
}
