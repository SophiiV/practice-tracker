// Головна панель: зведена статистика за направленнями та останні записи щоденників.
// Дані завантажуються паралельно (Promise.all) через хук useFetch.
import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api/resources.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ASSIGNMENT_STATUS, ENTRY_STATUS } from '../utils/constants.js';
import { formatDate, shortName, visibleForRole } from '../utils/format.js';
import StatCard from '../components/dashboard/StatCard.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { Loader, ErrorMessage } from '../components/ui/Feedback.jsx';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(
    () => Promise.all([api.assignments.listExpanded(), api.diaryEntries.listRecent(20)]).then(([assignments, entries]) => ({ assignments, entries })),
  );

  if (loading) return <Loader />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  // Показники рахуються лише за направленнями, доступними користувачу за його роллю
  const assignments = visibleForRole(data.assignments, user);
  const visibleIds = new Set(assignments.map((a) => a.id));
  const entries = data.entries.filter((e) => visibleIds.has(e.assignmentId));
  const count = (status) => assignments.filter((a) => a.status === status).length;
  const byId = Object.fromEntries(assignments.map((a) => [a.id, a]));
  const total = assignments.length || 1;

  return (
    <>
      <div>
        <h1>Головна панель</h1>
        <p className="muted">Вітаємо, {shortName(user.fullName)}! Навчальний рік 2025/2026 · Виробнича практика</p>
      </div>

      <div className={styles.stats}>
        <StatCard value={assignments.length} label="Направлень усього" tone="blue" />
        <StatCard value={count('in_progress')} label="Проходять практику" tone="blue" />
        <StatCard value={count('report_submitted')} label="Звіт подано, очікує захисту" tone="orange" />
        <StatCard value={count('defended')} label="Захищено" tone="green" />
      </div>

      <div className={styles.columns}>
        <section className="card">
          <div className="row spread" style={{ marginBottom: '0.5rem' }}>
            <h2>Останні записи щоденників</h2>
            <Link to="/assignments">Усі направлення →</Link>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>Дата</th><th>Студент</th><th className="only-desktop">Опис</th><th>Год.</th><th>Статус</th></tr>
              </thead>
              <tbody>
                {entries.slice(0, 6).map((e) => {
                  const a = byId[e.assignmentId];
                  return (
                    <tr key={e.id}>
                      <td>{formatDate(e.date)}</td>
                      <td>{a ? <Link to={`/assignments/${a.id}`}>{shortName(a.student?.fullName)}</Link> : '—'}</td>
                      <td className={`only-desktop ${styles.desc}`}>{e.description}</td>
                      <td>{e.hours}</td>
                      <td><StatusBadge dict={ENTRY_STATUS} value={e.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2>Розподіл за статусами</h2>
          {Object.entries(ASSIGNMENT_STATUS).map(([key, meta]) => (
            <div key={key} className={styles.barRow}>
              <span className={styles.barLabel}>{meta.label}</span>
              <div className={styles.barTrack}>
                <div className={`${styles.barFill} ${styles[meta.color]}`} style={{ width: `${(count(key) / total) * 100}%` }} />
              </div>
              <span className={styles.barValue}>{count(key)}</span>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
