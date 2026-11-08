// Хук керування станом форми: значення, помилки, «торкнуті» поля, обробка submit.
// validate(values) повертає об'єкт помилок; onSubmit викликається лише якщо помилок немає.
import { useState, useCallback } from 'react';

export function useForm(initialValues, validate, onSubmit) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setValues((v) => ({ ...v, [name]: type === 'checkbox' ? checked : value }));
  }, []);

  // Валідація поля при втраті фокусу — користувач бачить помилку одразу, а не лише після submit
  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched((t) => ({ ...t, [name]: true }));
    setErrors(validate({ ...values }));
  }, [values, validate]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const errs = validate(values);
    setErrors(errs);
    setTouched(Object.fromEntries(Object.keys(values).map((k) => [k, true])));
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await onSubmit(values);
    } catch (err) {
      setSubmitError(err.message || 'Не вдалося зберегти');
    } finally {
      setSubmitting(false);
    }
  }, [values, validate, onSubmit]);

  // Помилку показуємо лише для полів, яких торкались (або після спроби submit)
  const fieldError = (name) => (touched[name] ? errors[name] : undefined);

  return { values, setValues, errors, fieldError, handleChange, handleBlur, handleSubmit, submitting, submitError };
}
