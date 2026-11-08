import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { http } from '../api/client.js';
import Button from '../components/ui/Button.jsx';
import FormField from '../components/ui/FormField.jsx';
import styles from './LoginPage.module.css';
export default function RegisterPage() {
  const { user } = useAuth();
  const [values,setValues]=useState({fullName:'',groupName:'',recordBookNumber:'',email:'',password:''});
  const [errors,setErrors]=useState({}); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false); const [done,setDone]=useState(false);
  if(user) return <Navigate to="/" replace />;
  async function submit(e) {
    e.preventDefault(); setErrors({}); setMessage(''); setBusy(true);
    try { await http.post('/auth/register',values); setDone(true); }
    catch(err){setErrors(err.details || {});setMessage(err.message);} finally{setBusy(false);}
  }
  return <div className={styles.page}><form className={`card ${styles.card}`} onSubmit={submit} noValidate><h1>Реєстрація студента</h1>
    {done ? <><p role="status">Обліковий запис створено. Увійдіть зі своєю поштою та паролем. Направлення на практику додасть адміністратор.</p><Link to="/login">Перейти до входу</Link></> : <><p className="muted">Створіть обліковий запис для оформлення документів і ведення щоденника практики.</p>
    {[['fullName','Прізвище, ім’я, по батькові','text',100],['groupName','Група','text',30],['recordBookNumber','Номер залікової книжки','text',30],['email','Електронна пошта','email',120],['password','Пароль','password',72]].map(([name,label,type,max])=><FormField key={name} name={name} label={label} type={type} required maxLength={max} autoComplete={type==='password'?'new-password':name==='email'?'email':'off'} value={values[name]} error={errors[name]} hint={name==='password'?'Від 8 символів':undefined} onChange={e=>setValues(v=>({...v,[name]:e.target.value}))} />)}
    {message && <p role="alert">{message}</p>}<Button type="submit" disabled={busy}>{busy?'Створення…':'Зареєструватися'}</Button><p style={{marginTop:16}}><Link to="/login">Уже є обліковий запис? Увійти</Link></p></>}
  </form></div>;
}
