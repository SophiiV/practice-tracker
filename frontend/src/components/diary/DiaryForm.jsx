// Форма додавання запису до щоденника практики (для студента).
// Валідація: дата в межах періоду практики, години 1–12, опис не менше 10 символів.
import { useForm } from '../../hooks/useForm.js';
import { api } from '../../api/resources.js';
import { validateDiaryEntry } from '../../utils/validation.js';
import { todayIso } from '../../utils/format.js';
import FormField from '../ui/FormField.jsx';
import Button from '../ui/Button.jsx';

// Дата за замовчуванням — сьогодні, але не раніше початку і не пізніше кінця практики
function defaultDate(period) {
  const today = todayIso();
  if (!period) return today;
  if (today < period.startDate) return period.startDate;
  if (today > period.endDate) return period.endDate;
  return today;
}

export default function DiaryForm({ assignmentId, period, onSaved }) {
  const form = useForm(
    { date: defaultDate(period), hours: '6', description: '' },
    (values) => validateDiaryEntry(values, period),
    async (values) => {
      const saved = await api.diaryEntries.create({
        assignmentId: Number(assignmentId),
        date: values.date,
        hours: Number(values.hours),
        description: values.description.trim(),
        status: 'submitted',
        teacherComment: '',
      });
      form.setValues({ date: values.date, hours: '6', description: '' }); // очищення форми після успіху
      onSaved(saved);
    },
  );
  const { values, fieldError, handleChange, handleBlur, handleSubmit, submitting, submitError } = form;

  return (
    <form onSubmit={handleSubmit} noValidate className="card">
      <h3>Новий запис</h3>
      <div className="grid-2">
        <FormField label="Дата" name="date" type="date" required min={period?.startDate} max={period?.endDate}
          value={values.date} onChange={handleChange} onBlur={handleBlur} error={fieldError('date')} />
        <FormField label="Кількість годин" name="hours" type="number" min="1" max="12" step="0.5" required
          value={values.hours} onChange={handleChange} onBlur={handleBlur} error={fieldError('hours')} />
      </div>
      <FormField as="textarea" label="Опис виконаної роботи" name="description" required placeholder="Що було зроблено протягом дня (мінімум 10 символів)"
        value={values.description} onChange={handleChange} onBlur={handleBlur} error={fieldError('description')}
        hint={`${values.description.length} символів`} />
      {submitError && <div style={{ color: 'var(--color-danger)', marginBottom: '0.75rem' }} role="alert">⚠ {submitError}</div>}
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button type="submit" disabled={submitting}>{submitting ? 'Збереження…' : 'Додати запис'}</Button>
      </div>
    </form>
  );
}
