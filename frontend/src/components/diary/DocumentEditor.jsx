import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { http, downloadDocument } from '../../api/client.js';
import { documentFields } from '../../../../shared/documentFields.js';
import Button from '../ui/Button.jsx';
import FormField from '../ui/FormField.jsx';
import { Loader, ErrorMessage } from '../ui/Feedback.jsx';
import styles from './DocumentEditor.module.css';

export default function DocumentEditor({ assignment }) {
  const [kind, setKind] = useState('contract');
  return <section className={styles.section}>
    <div className="row" aria-label="Оберіть документ">
      <Button variant={kind === 'contract' ? 'primary' : 'secondary'} onClick={() => setKind('contract')}>Договір на практику</Button>
      <Button variant={kind === 'diary' ? 'primary' : 'secondary'} onClick={() => setKind('diary')}>Щоденник для друку</Button>
    </div>
    <Editor key={`${assignment.id}-${kind}`} kind={kind} assignment={assignment} />
  </section>;
}
function Editor({ kind, assignment }) {
  const { data, loading, error, reload } = useFetch(() => http.get(`/documents/${assignment.id}/${kind}`));
  if (loading) return <Loader />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;
  return <DocumentForm kind={kind} assignment={assignment} initial={data} />;
}
function DocumentForm({ kind, assignment, initial }) {
  const { user } = useAuth();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const editable = user.role === 'student' && user.studentId === assignment.studentId;
  const path = `/documents/${assignment.id}/${kind}`;
  function change(name, value) { setValues(v => ({ ...v, [name]: value })); setDirty(true); setErrors({}); setMessage(''); }
  async function save(exportFile = false) {
    setBusy(true); setErrors({}); setMessage('');
    try {
      if (editable) { const saved = await http.put(path, values); setValues(saved); setDirty(false); }
      if (exportFile) { await downloadDocument(path + '/download', `${kind === 'contract' ? 'Договір' : 'Щоденник'}_${assignment.id}.docx`); setMessage('Документ завантажено. Відкрийте його у Word або LibreOffice та надрукуйте.'); }
      else setMessage('Чернетку збережено. Можна повернутися до заповнення пізніше.');
    } catch (e) { setErrors(e.details || {}); setMessage(e.message); }
    finally { setBusy(false); }
  }
  const schedule = values.schedule || [];
  function changeRow(index, key, value) { change('schedule', schedule.map((r,i) => i === index ? { ...r, [key]: value } : r)); }
  return <form className={`card ${styles.form}`} onSubmit={e => { e.preventDefault(); save(); }} noValidate>
    <div className="row spread"><h2>{kind === 'contract' ? 'Оформлення договору' : 'Оформлення щоденника'}</h2><a href={`/api/materials/${kind}.docx`} download>Завантажити бланк</a></div>
    <p className="muted">{assignment.student.fullName} · {assignment.student.groupName} · {assignment.period.type} практика</p>
    <p>Документ формується за наданим університетським шаблоном. Підписи й печатки заповнюються після друку.</p>
    {kind === 'contract' && <p className="muted">Перевірте курс, код спеціальності та реквізити перед друком. Назва університету й дані його представника збережені з бланка.</p>}
    {kind === 'diary' && <p className="muted">Робочі записи автоматично переносяться з вкладки «Щоденник». Назва практики й період беруться з направлення. Фактичні дати прибуття та вибуття можна залишити для ручного заповнення.</p>}
    {!editable && <p className="muted">Перегляд документа студента. Заповнює студент-власник.</p>}
    <fieldset disabled={busy || !editable} className={styles.fieldset}>
      <div className="grid-2">{documentFields[kind].map(([name,label,max,required,type]) => <FormField key={name} name={name} label={label} type={type || 'text'} maxLength={max} required={required} value={values[name] || ''} onChange={e => change(name,e.target.value)} error={errors[name]} />)}</div>
      {kind === 'diary' && <section>
        <h3>Календарний графік</h3><p className="muted">Додайте заплановані роботи та строки їх виконання. Для практики понад два тижні таблиця продовжується у форматі університетського бланка.</p>
        {schedule.map((r,i) => <div key={i} className={styles.schedule}>
          <FormField label={`Робота ${i+1}`} name={`schedule-${i}-title`} value={r.title} maxLength={180} onChange={e=>changeRow(i,'title',e.target.value)} error={errors[`schedule.${i}.title`]} />
          <div className="grid-2"><FormField label="Початок роботи" name={`schedule-${i}-start`} type="date" min={assignment.period.startDate} max={assignment.period.endDate} value={r.startDate} onChange={e=>changeRow(i,'startDate',e.target.value)} error={errors[`schedule.${i}.dates`]} /><FormField label="Завершення роботи" name={`schedule-${i}-end`} type="date" min={assignment.period.startDate} max={assignment.period.endDate} value={r.endDate} onChange={e=>changeRow(i,'endDate',e.target.value)} /></div>
          <div className="row spread"><label><input type="checkbox" checked={r.completed} onChange={e=>changeRow(i,'completed',e.target.checked)} /> Виконано</label><Button variant="danger" onClick={()=>change('schedule',schedule.filter((_,j)=>i!==j))}>Прибрати роботу {i+1}</Button></div>
        </div>)}
        <Button variant="secondary" disabled={schedule.length >= 48} onClick={()=>change('schedule',[...schedule,{title:'',startDate:assignment.period.startDate,endDate:assignment.period.endDate,completed:false}])}>+ Додати роботу до графіка</Button>
        {errors.schedule && <p role="alert">{errors.schedule}</p>}
      </section>}
    </fieldset>
    <div className="row">{editable && <Button type="submit" disabled={busy}>Зберегти чернетку</Button>}<Button variant="secondary" disabled={busy} onClick={()=>save(true)}>{busy ? 'Обробка…' : 'Завантажити заповнений DOCX'}</Button></div>
    <p className="muted">{dirty ? 'Є незбережені зміни. Завантаження також збереже їх.' : 'Чернетка зберігається на сервері.'} Поля зі * обов’язкові для завантаження заповненого документа.</p>
    {message && <p role={Object.keys(errors).length ? 'alert' : 'status'} className={styles.message}>{message}</p>}
  </form>;
}
