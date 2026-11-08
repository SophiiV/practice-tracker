// Форма створення / редагування направлення на практику (у модальному вікні).
// Довідники (студенти, бази, керівники, періоди) завантажуються з API для випадаючих списків.
// Стан форми та валідація — через хук useForm; правила — utils/validation.js.
import { useForm } from '../../hooks/useForm.js';
import { useFetch } from '../../hooks/useFetch.js';
import { api } from '../../api/resources.js';
import { validateAssignment } from '../../utils/validation.js';
import { ASSIGNMENT_STATUS } from '../../utils/constants.js';
import FormField from '../ui/FormField.jsx';
import Button from '../ui/Button.jsx';
import { Loader, ErrorMessage } from '../ui/Feedback.jsx';

const EMPTY = { studentId: '', periodId: '', enterpriseId: '', teacherId: '', supervisorName: '', orderNumber: '', orderDate: '', status: 'assigned' };

export default function AssignmentForm({ initial, onSaved, onCancel }) {
  const isEdit = Boolean(initial?.id);

  // Довідники для селектів
  const refs = useFetch(() =>
    Promise.all([api.students.list(), api.enterprises.list({ isActive: true }), api.teachers.list(), api.periods.list()])
      .then(([students, enterprises, teachers, periods]) => ({ students, enterprises, teachers, periods })),
  );

  const form = useForm(
    initial ? { ...EMPTY, ...initial } : EMPTY,
    validateAssignment,
    async (values) => {
      // Селекти повертають рядки — приводимо ідентифікатори до чисел перед відправкою на сервер
      const payload = {
        ...values,
        studentId: Number(values.studentId),
        periodId: Number(values.periodId),
        enterpriseId: Number(values.enterpriseId),
        teacherId: Number(values.teacherId),
      };
      const saved = isEdit ? await api.assignments.update(initial.id, payload) : await api.assignments.create(payload);
      onSaved(saved);
    },
  );

  if (refs.loading) return <Loader text="Завантаження довідників…" />;
  if (refs.error) return <ErrorMessage message={refs.error} onRetry={refs.reload} />;
  const { students, enterprises, teachers, periods } = refs.data;
  const { values, fieldError, handleChange, handleBlur, handleSubmit, submitting, submitError } = form;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FormField as="select" label="Студент" name="studentId" required value={values.studentId} onChange={handleChange} onBlur={handleBlur} error={fieldError('studentId')}>
        <option value="">— Оберіть студента —</option>
        {students.map((s) => <option key={s.id} value={s.id}>{s.fullName} ({s.groupName})</option>)}
      </FormField>

      <FormField as="select" label="Період практики" name="periodId" required value={values.periodId} onChange={handleChange} onBlur={handleBlur} error={fieldError('periodId')}>
        <option value="">— Оберіть період —</option>
        {periods.map((p) => <option key={p.id} value={p.id}>{p.type} {p.academicYear}, {p.semester} семестр ({p.startDate} – {p.endDate})</option>)}
      </FormField>

      <FormField as="select" label="База практики" name="enterpriseId" required value={values.enterpriseId} onChange={handleChange} onBlur={handleBlur} error={fieldError('enterpriseId')}>
        <option value="">— Оберіть базу практики —</option>
        {enterprises.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
      </FormField>

      <FormField as="select" label="Керівник від кафедри" name="teacherId" required value={values.teacherId} onChange={handleChange} onBlur={handleBlur} error={fieldError('teacherId')}>
        <option value="">— Оберіть керівника —</option>
        {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}, {t.position}</option>)}
      </FormField>

      <FormField label="Керівник від бази практики" name="supervisorName" placeholder="ПІБ представника підприємства" value={values.supervisorName} onChange={handleChange} onBlur={handleBlur} />

      <div className="grid-2">
        <FormField label="Номер наказу" name="orderNumber" placeholder="№ 815-с" value={values.orderNumber} onChange={handleChange} onBlur={handleBlur} />
        <FormField label="Дата наказу" name="orderDate" type="date" value={values.orderDate} onChange={handleChange} onBlur={handleBlur} error={fieldError('orderDate')} />
      </div>

      <FormField as="select" label="Статус" name="status" value={values.status} onChange={handleChange}>
        {Object.entries(ASSIGNMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </FormField>

      {submitError && <div style={{ color: 'var(--color-danger)', marginBottom: '0.75rem' }} role="alert">⚠ {submitError}</div>}

      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>Скасувати</Button>
        <Button type="submit" disabled={submitting}>{submitting ? 'Збереження…' : isEdit ? 'Зберегти зміни' : 'Створити направлення'}</Button>
      </div>
    </form>
  );
}
