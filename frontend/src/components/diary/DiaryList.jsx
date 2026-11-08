// Список записів щоденника. Керівник може схвалити або відхилити запис (PATCH статусу).
import { useState } from 'react';
import { api } from '../../api/resources.js';
import { ENTRY_STATUS } from '../../utils/constants.js';
import { formatDate } from '../../utils/format.js';
import StatusBadge from '../ui/StatusBadge.jsx';
import Button from '../ui/Button.jsx';
import { EmptyState } from '../ui/Feedback.jsx';
import styles from './DiaryList.module.css';

export default function DiaryList({ entries, canReview, onChanged, onError }) {
  const [busyId, setBusyId] = useState(null);

  async function review(entry, status) {
    let comment = entry.teacherComment || '';
    if (status === 'rejected') {
      comment = window.prompt('Вкажіть причину відхилення запису:', comment) ?? null;
      if (comment === null) return; // користувач натиснув «Скасувати»
    }
    setBusyId(entry.id);
    try {
      await api.diaryEntries.patch(entry.id, { status, teacherComment: comment });
      onChanged();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (entries.length === 0) return <EmptyState title="Записів ще немає" text="Щоденник заповнюється студентом щодня протягом практики." />;

  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr><th>Дата</th><th>Опис роботи</th><th>Год.</th><th>Статус</th>{canReview && <th>Дії</th>}</tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td className={styles.date}>{formatDate(e.date)}</td>
              <td>
                {e.description}
                {e.teacherComment && <div className={styles.comment}>Коментар керівника: {e.teacherComment}</div>}
              </td>
              <td>{e.hours}</td>
              <td><StatusBadge dict={ENTRY_STATUS} value={e.status} /></td>
              {canReview && (
                <td>
                  <div className="row" style={{ gap: '0.3rem', flexWrap: 'nowrap' }}>
                    <Button size="sm" variant="secondary" disabled={busyId === e.id || e.status === 'approved'} onClick={() => review(e, 'approved')} title="Схвалити">✓</Button>
                    <Button size="sm" variant="danger" disabled={busyId === e.id || e.status === 'rejected'} onClick={() => review(e, 'rejected')} title="Відхилити">✗</Button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
