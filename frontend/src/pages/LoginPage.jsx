// Сторінка входу. Пошта і пароль перевіряються на сервері,
// який у разі успіху повертає токен доступу.
import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/ui/Button.jsx';
import FormField from '../components/ui/FormField.jsx';
import styles from './LoginPage.module.css';

// Демонстраційні облікові записи (створені у початкових даних бази)
const DEMO = [
  { role: 'адміністратор', email: 'admin@pnu.edu.ua' },
  { role: 'керівник практики', email: 'mykola.pikuliak@cnu.edu.ua' },
  { role: 'студент', email: 'sofiia.vasyliuk.23@pnu.edu.ua' },
];
const DEMO_PASSWORD = 'praktyka2026';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  function handleChange(e) {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setFormError('');
  }

  // Перевірка полів на клієнті — щоб не надсилати завідомо неповний запит
  function validate() {
    const errs = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errs.email = 'Введіть коректну електронну адресу';
    if (!values.password) errs.password = 'Введіть пароль';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setBusy(true);
    setFormError('');
    try {
      await login(values.email, values.password);
      navigate('/');
    } catch (err) {
      // Сервер повертає 401 з повідомленням, 422 — з переліком полів
      if (err.details) setErrors(err.details);
      else setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <form className={`card ${styles.card}`} onSubmit={handleSubmit} noValidate>
        <div className={styles.logo} aria-hidden="true">▤</div>
        <h1 className={styles.title}>Трекер Практики</h1>
        <p className="muted">Інформаційна система обліку та контролю проходження студентами виробничої практики</p>

        <FormField
          label="Електронна пошта" name="email" type="email" placeholder="name@pnu.edu.ua"
          value={values.email} onChange={handleChange} error={errors.email}
          autoComplete="username" required
        />
        <FormField
          label="Пароль" name="password" type="password" placeholder="Ваш пароль"
          value={values.password} onChange={handleChange} error={errors.password}
          autoComplete="current-password" required
        />
        {formError && <div className={styles.formError} role="alert">⚠ {formError}</div>}

        <Button type="submit" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Вхід…' : 'Увійти'}
        </Button>

        <p style={{marginTop:16}}><Link to="/register">Реєстрація студента</Link></p>
        <div className={styles.demo}>
          <div className="muted" style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>
            Демонстраційні записи (пароль «{DEMO_PASSWORD}») — натисніть, щоб підставити:
          </div>
          {DEMO.map((u) => (
            <button
              key={u.email} type="button" className={styles.demoBtn}
              onClick={() => { setValues({ email: u.email, password: DEMO_PASSWORD }); setErrors({}); setFormError(''); }}
            >
              <strong>{u.role}</strong> — {u.email}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
