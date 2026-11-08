// Діалог підтвердження незворотної дії (наприклад, видалення). Принцип «контроль користувача».
import Modal from './Modal.jsx';
import Button from './Button.jsx';

export default function ConfirmDialog({ title = 'Підтвердження', message, confirmLabel = 'Видалити', onConfirm, onCancel, busy }) {
  return (
    <Modal title={title} onClose={onCancel} width={420}>
      <p>{message}</p>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>Скасувати</Button>
        <Button variant="danger" onClick={onConfirm} disabled={busy}>{busy ? 'Видалення…' : confirmLabel}</Button>
      </div>
    </Modal>
  );
}
