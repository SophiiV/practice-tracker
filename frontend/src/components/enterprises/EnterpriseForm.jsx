// Форма створення / редагування бази практики.
import { useForm } from '../../hooks/useForm.js';
import { api } from '../../api/resources.js';
import { validateEnterprise } from '../../utils/validation.js';
import FormField from '../ui/FormField.jsx';
import Button from '../ui/Button.jsx';

const EMPTY = { name: '', address: '', phone: '', email: '', contractNumber: '', contractDate: '', isActive: true };

export default function EnterpriseForm({ initial, onSaved, onCancel }) {
  const isEdit = Boolean(initial?.id);
  const { values, fieldError, handleChange, handleBlur, handleSubmit, submitting, submitError } = useForm(
    initial ? { ...EMPTY, ...initial } : EMPTY,
    validateEnterprise,
    async (values) => {
      const saved = isEdit ? await api.enterprises.update(initial.id, values) : await api.enterprises.create(values);
      onSaved(saved);
    },
  );

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FormField label="Назва підприємства" name="name" required placeholder="ТОВ «Назва»" value={values.name} onChange={handleChange} onBlur={handleBlur} error={fieldError('name')} />
      <FormField label="Адреса" name="address" required placeholder="м. Івано-Франківськ, вул. …" value={values.address} onChange={handleChange} onBlur={handleBlur} error={fieldError('address')} />
      <div className="grid-2">
        <FormField label="Телефон" name="phone" type="tel" placeholder="+380XXXXXXXXX" value={values.phone} onChange={handleChange} onBlur={handleBlur} error={fieldError('phone')} />
        <FormField label="Email" name="email" type="email" placeholder="hr@company.ua" value={values.email} onChange={handleChange} onBlur={handleBlur} error={fieldError('email')} />
      </div>
      <div className="grid-2">
        <FormField label="Номер договору" name="contractNumber" placeholder="Д-15/25" value={values.contractNumber} onChange={handleChange} onBlur={handleBlur} />
        <FormField label="Дата договору" name="contractDate" type="date" value={values.contractDate} onChange={handleChange} onBlur={handleBlur} error={fieldError('contractDate')} />
      </div>
      <label className="row" style={{ marginBottom: '1rem', cursor: 'pointer' }}>
        <input type="checkbox" name="isActive" checked={values.isActive} onChange={handleChange} /> Активна база (доступна для нових направлень)
      </label>
      {submitError && <div style={{ color: 'var(--color-danger)', marginBottom: '0.75rem' }} role="alert">⚠ {submitError}</div>}
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>Скасувати</Button>
        <Button type="submit" disabled={submitting}>{submitting ? 'Збереження…' : isEdit ? 'Зберегти зміни' : 'Додати базу'}</Button>
      </div>
    </form>
  );
}
