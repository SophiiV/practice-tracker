import { Link } from 'react-router-dom';
export default function MaterialsPage() {
  return <>
    <div><h1>Документи та інструктаж</h1><p className="muted">Університетські бланки та матеріали для проходження практики</p></div>
    <div className="card"><h2>Договір та щоденник</h2><p>Відкрийте своє направлення і вкладку «Документи». Заповніть форму, збережіть чернетку та завантажте готовий файл для друку.</p><div className="row"><Link to="/assignments">Перейти до направлень →</Link><a href="/api/materials/contract.docx" download>Бланк договору</a><a href="/api/materials/diary.docx" download>Бланк щоденника</a></div><p className="muted" style={{marginTop:12}}>Якщо направлення ще немає, зверніться до адміністратора. Бланки та інструктаж доступні вже зараз.</p></div>
    <section className="card"><h2>Інструктаж з техніки безпеки</h2><p>Ознайомтеся з інструктажем перед початком практики.</p><div className="row"><a href="/api/materials/safety.pdf" target="_blank" rel="noreferrer">Відкрити PDF в окремій вкладці</a><a href="/api/materials/safety.pdf?download=1" download>Завантажити інструктаж</a></div><iframe title="Інструктаж з техніки безпеки" src="/api/materials/safety.pdf" style={{width:'100%',height:'70vh',border:'1px solid #dfe4ea',marginTop:16}} /><p className="muted">Якщо перегляд PDF не підтримується браузером, скористайтеся посиланням для завантаження.</p></section>
  </>;
}
