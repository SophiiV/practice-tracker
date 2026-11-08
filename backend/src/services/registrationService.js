import bcrypt from 'bcryptjs';
import { db, get, run } from '../db.js';
import { assertValid } from '../utils/validate.js';
import { ApiError } from '../utils/ApiError.js';
import { validateRegistration } from '../utils/registrationValidation.js';
export async function registerStudent(data) {
  assertValid(validateRegistration(data));
  const email=data.email.trim().toLowerCase();
  if (get('SELECT id FROM users WHERE lower(email)=?',email) || get('SELECT id FROM students WHERE record_book_number=?',data.recordBookNumber.trim())) throw ApiError.conflict('Пошта або номер залікової книжки вже зареєстровані');
  const hash=await bcrypt.hash(data.password,10);
  db.exec('BEGIN');
  try {
    const u=run("INSERT INTO users(full_name,email,password_hash,role) VALUES(?,?,?,'student')",data.fullName.trim(),email,hash);
    const s=run('INSERT INTO students(user_id,group_name,record_book_number) VALUES(?,?,?)',Number(u.lastInsertRowid),data.groupName.trim(),data.recordBookNumber.trim());
    db.exec('COMMIT'); return {id:Number(u.lastInsertRowid),studentId:Number(s.lastInsertRowid),role:'student',email};
  } catch(e) {db.exec('ROLLBACK');throw e;}
}
