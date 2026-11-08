// Таблиця направлень (десктопна версія).
import { Link } from 'react-router-dom';
import StatusBadge from '../ui/StatusBadge.jsx';
import Button from '../ui/Button.jsx';
import { ASSIGNMENT_STATUS } from '../../utils/constants.js';

export default function AssignmentTable({ items, canManage, onEdit, onDelete }) {
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th>№</th><th>Студент</th><th>Група</th><th>База практики</th><th>Керівник</th><th>Статус</th><th>Дії</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.id}>
              <td>{a.id}</td>
              <td><Link to={`/assignments/${a.id}`}>{a.student?.fullName || '—'}</Link></td>
              <td>{a.student?.groupName}</td>
              <td>{a.enterprise?.name}</td>
              <td>{a.teacher?.shortName}</td>
              <td><StatusBadge dict={ASSIGNMENT_STATUS} value={a.status} /></td>
              <td>
                <div className="row" style={{ gap: '0.35rem', flexWrap: 'nowrap' }}>
                  <Link to={`/assignments/${a.id}`}><Button size="sm" variant="ghost">Детальніше</Button></Link>
                  {canManage && <Button size="sm" variant="secondary" onClick={() => onEdit(a)} aria-label="Редагувати">✎</Button>}
                  {canManage && <Button size="sm" variant="danger" onClick={() => onDelete(a)} aria-label="Видалити">🗑</Button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
