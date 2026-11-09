import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'practice-integration-'));process.env.DB_PATH=path.join(dir,'test.db');
let db,registerStudent,documentService; const results=[];
const user={id:4,role:'student',studentId:1};
before(async()=>{({db}=await import('../src/db.js'));({registerStudent}=await import('../src/services/registrationService.js'));({documentService}=await import('../src/services/documentService.js'));});
after(()=>{fs.writeFileSync(new URL('../../testing/integration-results.json',import.meta.url),JSON.stringify(results,null,2));db?.close();fs.rmSync(dir,{recursive:true,force:true});});
function it(id,name,fn){test(id+': '+name,async()=>{const result={id,name};try{result.actual=await fn();result.status='PASS';}catch(e){result.actual=e.message;result.status='FAIL';throw e;}finally{results.push(result);}});}
it('IT-01','Реєстрація → сервіс → users і students → повторне з’єднання',async()=>{
 const created=await registerStudent({fullName:'Інтеграційна Марія',email:'integration@example.com',password:'Testing123!',groupName:'ІПЗ-41',recordBookNumber:'IT-001'});
 const reader=new DatabaseSync(process.env.DB_PATH); const row=reader.prepare('SELECT u.full_name,u.email,u.role,u.password_hash,s.group_name FROM users u JOIN students s ON s.user_id=u.id WHERE u.id=?').get(created.id); reader.close();
 assert.equal(row.full_name,'Інтеграційна Марія');assert.equal(row.group_name,'ІПЗ-41');assert.equal(row.role,'student');assert.match(row.password_hash,/^\$2[aby]\$/);
 return {userId:created.id,fullName:row.full_name,email:row.email,groupName:row.group_name,role:row.role,passwordStoredAsHash:true};
});
it('IT-02','Щоденник → транзакція → метадані і календарний графік',async()=>{
 const data={...documentService.get(user,2,'diary'),faculty:'Тестовий факультет',schedule:[{title:'Розробка форми',startDate:'2025-11-03',endDate:'2025-11-07',completed:false}]};
 documentService.save(user,2,'diary',data);const reader=new DatabaseSync(process.env.DB_PATH); const meta=reader.prepare('SELECT faculty FROM diary_documents WHERE assignment_id=2').get();const row=reader.prepare('SELECT title,start_date,end_date FROM diary_schedule WHERE assignment_id=2').get();reader.close();
 assert.equal(meta.faculty,data.faculty);assert.equal(row.title,data.schedule[0].title);assert.equal(row.start_date,'2025-11-03');return {assignmentId:2,...meta,...row};
});
it('IT-03','Видалення направлення → каскадне видалення документів і графіка',async()=>{
 documentService.save(user,2,'contract',documentService.get(user,2,'contract'));
 assert.equal(db.prepare('SELECT COUNT(*) n FROM diary_schedule WHERE assignment_id=2').get().n,1);
 db.prepare('DELETE FROM assignments WHERE id=2').run();
 for(const t of ['practice_contracts','diary_documents','diary_schedule','diary_entries']) assert.equal(db.prepare(`SELECT COUNT(*) n FROM ${t} WHERE assignment_id=2`).get().n,0);
 assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]); return 'Направлення 2 видалено; 0 залежних рядків; foreign_key_check без порушень';
});
