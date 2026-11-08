// Сторінка «Направлення на практику»: список з пошуком і фільтрами, створення / редагування
// (модальна форма) та видалення (з підтвердженням). Адаптивність: таблиця на десктопі,
// картки на мобільному. Права: створювати/редагувати/видаляти може лише адміністратор.
import { useState, useMemo } from 'react';
import { useFetch } from '../hooks/useFetch.js';
import { useToast } from '../hooks/useToast.js';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/resources.js';
import { ASSIGNMENT_STATUS } from '../utils/constants.js';
import { visibleForRole } from '../utils/format.js';
import AssignmentTable from '../components/assignments/AssignmentTable.jsx';
import AssignmentCard from '../components/assignments/AssignmentCard.jsx';
import AssignmentForm from '../components/assignments/AssignmentForm.jsx';
import Modal from '../components/ui/Modal.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import Button from '../components/ui/Button.jsx';
import { Loader, ErrorMessage, EmptyState, Toast } from '../components/ui/Feedback.jsx';
import styles from './ListPage.module.css';

export default function AssignmentsPage() {
  const { user, can } = useAuth();
  const { data: items, loading, error, reload } = useFetch(() => api.assignments.listExpanded());
  const { toast, show } = useToast();

  // Стан UI: пошук, фільтри, відкрита модалка (null | 'create' | об'єкт для редагування), запис на видалення
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [group, setGroup] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  // Студент бачить лише власні направлення, керівник — своїх студентів, адміністратор — усі
  const visible = useMemo(() => visibleForRole(items, user), [items, user]);

  const groups = useMemo(() => [...new Set(visible.map((a) => a.student?.groupName).filter(Boolean))].sort(), [visible]);

  // Фільтрація виконується на клієнті (useMemo — перераховується лише при зміні залежностей)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visible.filter((a) =>
      (!status || a.status === status) &&
      (!group || a.student?.groupName === group) &&
      (!q || a.student?.fullName.toLowerCase().includes(q) || a.enterprise?.name.toLowerCase().includes(q)),
    );
  }, [visible, search, status, group]);

  async function confirmDelete() {
    setBusy(true);
    try {
      await api.assignments.remove(deleting.id);
      show('Направлення видалено');
      setDeleting(null);
      reload();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  function handleSaved() {
    show(editing === 'create' ? 'Направлення створено' : 'Зміни збережено');
    setEditing(null);
    reload();
  }

  return (
    <>
      <div className="row spread">
        <div>
          <h1>Направлення на практику</h1>
          <p className="muted" style={{ margin: 0 }}>Облік розподілу студентів за базами практики</p>
        </div>
        {can('manage') && <Button onClick={() => setEditing('create')}>+ Додати направлення</Button>}
      </div>

      <div className={`card ${styles.filters}`}>
        <input
          className={styles.search}
          type="search"
          placeholder="Пошук за студентом або базою практики…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Пошук"
        />
        <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Фільтр за статусом">
          <option value="">Усі статуси</option>
          {Object.entries(ASSIGNMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className={styles.select} value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Фільтр за групою">
          <option value="">Усі групи</option>
          {groups.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {loading && <Loader />}
      {error && <ErrorMessage message={error} onRetry={reload} />}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState title="Направлень не знайдено" text="Спробуйте змінити параметри пошуку або додайте нове направлення." />
      )}
      {!loading && !error && filtered.length > 0 && (
        <>
          <div className="only-desktop card" style={{ padding: 0 }}>
            <AssignmentTable items={filtered} canManage={can('manage')} onEdit={setEditing} onDelete={setDeleting} />
          </div>
          <div className={`only-mobile ${styles.cards}`}>
            {filtered.map((a) => <AssignmentCard key={a.id} item={a} canManage={can('manage')} onEdit={setEditing} onDelete={setDeleting} />)}
          </div>
          <p className="muted" style={{ fontSize: '0.85rem' }}>Показано {filtered.length} із {visible.length}</p>
        </>
      )}

      {editing && (
        <Modal title={editing === 'create' ? 'Нове направлення на практику' : 'Редагування направлення'} onClose={() => setEditing(null)}>
          <AssignmentForm initial={editing === 'create' ? null : editing} onSaved={handleSaved} onCancel={() => setEditing(null)} />
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog
          message={`Видалити направлення студента ${deleting.student?.fullName}? Разом з ним буде втрачено записи щоденника. Цю дію не можна скасувати.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
          busy={busy}
        />
      )}
      <Toast toast={toast} />
    </>
  );
}
