// Картка направлення: інформація про практику, вкладки «Щоденник», «Звіт», «Оцінка».
// Параметр :id береться з URL (useParams). Дії залежать від ролі користувача.
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { useToast } from '../hooks/useToast.js';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/resources.js';
import { ASSIGNMENT_STATUS, REPORT_STATUS } from '../utils/constants.js';
import { formatDate } from '../utils/format.js';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import Button from '../components/ui/Button.jsx';
import DiaryList from '../components/diary/DiaryList.jsx';
import DiaryForm from '../components/diary/DiaryForm.jsx';
import GradeForm from '../components/grades/GradeForm.jsx';
import { Loader, ErrorMessage, Toast } from '../components/ui/Feedback.jsx';
import styles from './AssignmentDetailsPage.module.css';

import DocumentEditor from '../components/diary/DocumentEditor.jsx';

const TABS = [
  { key: 'documents', label: 'Документи' },
  { key: 'diary', label: 'Щоденник' },
  { key: 'report', label: 'Звіт' },
  { key: 'grade', label: 'Оцінка' },
];

export default function AssignmentDetailsPage() {
  const { id } = useParams();
  const { user, can } = useAuth();
  const { data: a, loading, error, reload } = useFetch(() => api.assignments.getFull(id), [id]);
  const { toast, show } = useToast();
  const [tab, setTab] = useState('diary');

  if (loading) return <Loader />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const totalHours = a.diary.reduce((sum, e) => sum + Number(e.hours), 0);
  const isOwner = user.role === 'student' && user.studentId === a.studentId;

  async function submitReport() {
    const fileName = window.prompt('Назва файлу звіту (наприклад, zvit_prizvyshche.pdf):', `zvit_${a.student.fullName.split(' ')[0].toLowerCase()}.pdf`);
    if (!fileName) return;
    try {
      await api.assignments.patch(a.id, { reportFileName: fileName, reportSubmittedAt: new Date().toISOString().slice(0, 10), reportStatus: 'submitted', status: 'report_submitted' });
      show('Звіт подано на перевірку');
      reload();
    } catch (err) { show(err.message, 'error'); }
  }

  async function reviewReport(reportStatus) {
    try {
      await api.assignments.patch(a.id, { reportStatus });
      show(reportStatus === 'accepted' ? 'Звіт прийнято' : 'Звіт повернуто на доопрацювання');
      reload();
    } catch (err) { show(err.message, 'error'); }
  }

  return (
    <>
      <Link to="/assignments" className={styles.back}>← Назад до списку</Link>

      <div className="row spread">
        <div>
          <h1>{a.student.fullName}</h1>
          <p className="muted" style={{ margin: 0 }}>{a.student.groupName} · {a.student.email}</p>
        </div>
        <StatusBadge dict={ASSIGNMENT_STATUS} value={a.status} />
      </div>

      <div className={`card ${styles.info}`}>
        <div><span className="muted">База практики</span><strong>{a.enterprise.name}</strong><span className="muted">{a.enterprise.address}</span></div>
        <div><span className="muted">Керівник від бази</span><strong>{a.supervisorName || '—'}</strong></div>
        <div><span className="muted">Керівник від кафедри</span><strong>{a.teacher.fullName}</strong><span className="muted">{a.teacher.position}</span></div>
        <div><span className="muted">Період</span><strong>{a.period.type}, {a.period.academicYear}</strong><span className="muted">{formatDate(a.period.startDate)} – {formatDate(a.period.endDate)}</span></div>
        <div><span className="muted">Наказ</span><strong>{a.orderNumber || '—'}</strong><span className="muted">{a.orderDate ? `від ${formatDate(a.orderDate)}` : ''}</span></div>
        <div><span className="muted">Годин у щоденнику</span><strong>{totalHours} / {a.period.hours}</strong>
          <div className={styles.progress}><div style={{ width: `${Math.min(100, (totalHours / a.period.hours) * 100)}%` }} /></div>
        </div>
      </div>

      <div className={styles.tabs} role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`} onClick={() => setTab(t.key)}>
            {t.label}{t.key === 'diary' ? ` (${a.diary.length})` : ''}
          </button>
        ))}
      </div>

      {tab === 'documents' && <DocumentEditor assignment={a} />}

      {tab === 'diary' && (
        <>
          <div className="card" style={{ padding: 0 }}>
            <DiaryList entries={a.diary} canReview={can('review')} onChanged={() => { show('Статус запису оновлено'); reload(); }} onError={(m) => show(m, 'error')} />
          </div>
          {isOwner && a.status !== 'defended' && (
            <DiaryForm assignmentId={a.id} period={a.period} onSaved={() => { show('Запис збережено'); reload(); }} />
          )}
        </>
      )}

      {tab === 'report' && (
        <div className="card">
          {a.reportFileName ? (
            <>
              <p><strong>Файл:</strong> {a.reportFileName} <span className="muted">(подано {formatDate(a.reportSubmittedAt)})</span></p>
              <p><strong>Статус:</strong> <StatusBadge dict={REPORT_STATUS} value={a.reportStatus} /></p>
              {can('review') && a.reportStatus === 'submitted' && (
                <div className="row">
                  <Button onClick={() => reviewReport('accepted')}>Прийняти звіт</Button>
                  <Button variant="danger" onClick={() => reviewReport('needs_revision')}>Повернути на доопрацювання</Button>
                </div>
              )}
              {isOwner && a.reportStatus === 'needs_revision' && <Button onClick={submitReport}>Подати виправлений звіт</Button>}
            </>
          ) : (
            <>
              <p className="muted">Звіт ще не подано.</p>
              {isOwner && <Button onClick={submitReport}>Подати звіт</Button>}
            </>
          )}
        </div>
      )}

      {tab === 'grade' && (
        <>
          {a.grade ? (
            <div className={`card ${styles.grade}`}>
              <div className={styles.score}>{a.grade.finalScore}<span>/100</span></div>
              <div>
                <div><strong>{a.grade.ectsGrade}</strong> — {a.grade.nationalGrade}</div>
                <div className="muted">База практики: {a.grade.enterpriseGrade} · Керівник: {a.grade.teacherGrade}</div>
                <div className="muted">Захист: {formatDate(a.grade.defenseDate)}{a.grade.comment ? ` · ${a.grade.comment}` : ''}</div>
              </div>
            </div>
          ) : (
            <div className="card"><p className="muted" style={{ margin: 0 }}>Оцінку ще не виставлено.</p></div>
          )}
          {can('review') && (a.reportStatus === 'accepted' || a.grade) && (
            <GradeForm assignment={a} existing={a.grade} onSaved={() => { show('Оцінку збережено'); reload(); }} />
          )}
          {can('review') && !a.grade && a.reportStatus !== 'accepted' && (
            <p className="muted">Оцінку можна виставити після прийняття звіту.</p>
          )}
        </>
      )}
      <Toast toast={toast} />
    </>
  );
}
