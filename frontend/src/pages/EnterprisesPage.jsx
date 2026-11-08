// Сторінка «Бази практики»: сітка карток, пошук, створення/редагування/видалення (адміністратор).
import { useState, useMemo } from 'react';
import { useFetch } from '../hooks/useFetch.js';
import { useToast } from '../hooks/useToast.js';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/resources.js';
import EnterpriseCard from '../components/enterprises/EnterpriseCard.jsx';
import EnterpriseForm from '../components/enterprises/EnterpriseForm.jsx';
import Modal from '../components/ui/Modal.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import Button from '../components/ui/Button.jsx';
import { Loader, ErrorMessage, EmptyState, Toast } from '../components/ui/Feedback.jsx';
import styles from './ListPage.module.css';

export default function EnterprisesPage() {
  const { can } = useAuth();
  const { data, loading, error, reload } = useFetch(() =>
    Promise.all([api.enterprises.list({ _sort: 'name' }), api.assignments.list()]).then(([enterprises, assignments]) => ({ enterprises, assignments })),
  );
  const { toast, show } = useToast();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.enterprises.filter((e) => !q || e.name.toLowerCase().includes(q) || e.address.toLowerCase().includes(q));
  }, [data, search]);

  const countFor = (id) => (data ? data.assignments.filter((a) => a.enterpriseId === id).length : 0);

  async function confirmDelete() {
    setBusy(true);
    try {
      await api.enterprises.remove(deleting.id);
      show('Базу практики видалено');
      setDeleting(null);
      reload();
    } catch (err) { show(err.message, 'error'); } finally { setBusy(false); }
  }

  return (
    <>
      <div className="row spread">
        <div>
          <h1>Бази практики</h1>
          <p className="muted" style={{ margin: 0 }}>Підприємства та установи, з якими укладено договори</p>
        </div>
        {can('manage') && <Button onClick={() => setEditing('create')}>+ Додати базу</Button>}
      </div>

      <div className={`card ${styles.filters}`}>
        <input className={styles.search} type="search" placeholder="Пошук за назвою або адресою…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Пошук" />
      </div>

      {loading && <Loader />}
      {error && <ErrorMessage message={error} onRetry={reload} />}
      {!loading && !error && filtered.length === 0 && <EmptyState title="Баз практики не знайдено" />}
      {!loading && !error && filtered.length > 0 && (
        <div className={styles.cardGrid}>
          {filtered.map((e) => (
            <EnterpriseCard key={e.id} item={e} studentsCount={countFor(e.id)} canManage={can('manage')} onEdit={setEditing} onDelete={setDeleting} />
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing === 'create' ? 'Нова база практики' : 'Редагування бази практики'} onClose={() => setEditing(null)}>
          <EnterpriseForm initial={editing === 'create' ? null : editing} onSaved={() => { show(editing === 'create' ? 'Базу додано' : 'Зміни збережено'); setEditing(null); reload(); }} onCancel={() => setEditing(null)} />
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog message={`Видалити базу практики «${deleting.name}»? Цю дію не можна скасувати.`} onConfirm={confirmDelete} onCancel={() => setDeleting(null)} busy={busy} />
      )}
      <Toast toast={toast} />
    </>
  );
}
