// Форма виставлення підсумкової оцінки (для керівника). Підсумковий бал обчислюється
// автоматично як середнє оцінки бази практики та оцінки керівника і переводиться у ECTS.
import { useForm } from '../../hooks/useForm.js';
import { api } from '../../api/resources.js';
import { validateGrade } from '../../utils/validation.js';
import { scoreToGrade } from '../../utils/constants.js';
import { todayIso } from '../../utils/format.js';
import FormField from '../ui/FormField.jsx';
import Button from '../ui/Button.jsx';

export default function GradeForm({ assignment, existing, onSaved }) {
  const form = useForm(
    { enterpriseGrade: existing?.enterpriseGrade ?? '', teacherGrade: existing?.teacherGrade ?? '', defenseDate: existing?.defenseDate || todayIso(), comment: existing?.comment || '' },
    validateGrade,
    async (values) => {
      const finalScore = Math.round((Number(values.enterpriseGrade) + Number(values.teacherGrade)) / 2);
      const scale = scoreToGrade(finalScore);
      const payload = {
        assignmentId: assignment.id,
        enterpriseGrade: Number(values.enterpriseGrade),
        teacherGrade: Number(values.teacherGrade),
        finalScore,
        ectsGrade: scale.ects,
        nationalGrade: scale.national,
        defenseDate: values.defenseDate,
        comment: values.comment.trim(),
      };
      const saved = existing ? await api.grades.update(existing.id, payload) : await api.grades.create(payload);
      // Після оцінювання направлення переходить у статус «Захищено»
      await api.assignments.patch(assignment.id, { status: 'defended' });
      onSaved(saved);
    },
  );
  const { values, fieldError, handleChange, handleBlur, handleSubmit, submitting, submitError } = form;

  // Попередній розрахунок для миттєвого зворотного зв'язку
  const preview = values.enterpriseGrade !== '' && values.teacherGrade !== ''
    ? Math.round((Number(values.enterpriseGrade) + Number(values.teacherGrade)) / 2) : null;
  const previewScale = preview !== null ? scoreToGrade(preview) : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="card">
      <h3>{existing ? 'Редагувати оцінку' : 'Виставити оцінку'}</h3>
      <div className="grid-2">
        <FormField label="Оцінка бази практики (0–100)" name="enterpriseGrade" type="number" min="0" max="100" required
          value={values.enterpriseGrade} onChange={handleChange} onBlur={handleBlur} error={fieldError('enterpriseGrade')} />
        <FormField label="Оцінка керівника (0–100)" name="teacherGrade" type="number" min="0" max="100" required
          value={values.teacherGrade} onChange={handleChange} onBlur={handleBlur} error={fieldError('teacherGrade')} />
      </div>
      <FormField label="Дата захисту" name="defenseDate" type="date" required value={values.defenseDate} onChange={handleChange} onBlur={handleBlur} error={fieldError('defenseDate')} />
      <FormField as="textarea" label="Коментар" name="comment" value={values.comment} onChange={handleChange} />
      {preview !== null && previewScale && (
        <p className="muted">Підсумок: <strong>{preview}</strong> балів → <strong>{previewScale.ects}</strong> ({previewScale.national})</p>
      )}
      {submitError && <div style={{ color: 'var(--color-danger)', marginBottom: '0.75rem' }} role="alert">⚠ {submitError}</div>}
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button type="submit" disabled={submitting}>{submitting ? 'Збереження…' : 'Зберегти оцінку'}</Button>
      </div>
    </form>
  );
}
