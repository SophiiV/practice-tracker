import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { assignmentService } from './assignmentService.js';
import { documentModel } from '../models/documentModel.js';
import { studentModel, teacherModel } from '../models/userModel.js';
import { enterpriseModel, periodModel } from '../models/enterpriseModel.js';
import { diaryModel } from '../models/diaryModel.js';
import { ApiError } from '../utils/ApiError.js';
import { assertValid } from '../utils/validate.js';
import { validateDocument } from '../utils/documentValidation.js';
const script = fileURLToPath(new URL('../../scripts/fill_document.py', import.meta.url));
export const documentService = {
  context(user, id, kind) {
    if (!['contract', 'diary'].includes(kind)) throw ApiError.notFound('Тип документа не знайдено');
    const assignment = assignmentService.getById(user, id);
    return { assignment, student: studentModel.findById(assignment.studentId), teacher: teacherModel.findById(assignment.teacherId), enterprise: enterpriseModel.findById(assignment.enterpriseId), period: periodModel.findById(assignment.periodId) };
  },
  get(user, id, kind) {
    const c = this.context(user, id, kind);
    const defaults = kind === 'contract' ? { number: '', city: 'Івано-Франківськ', signedOn: '', enterpriseName: c.enterprise.name, representative: '', authority: '', address: c.enterprise.address, email: c.enterprise.email || '', course: '4', specialty: '112 – «Інженерія програмного забезпечення»', validUntil: '', additionalTerms: '' } : { faculty: 'Факультет математики та інформатики', department: 'Інформаційних технологій', qualification: 'Бакалавр', educationProgram: 'Інженерія програмного забезпечення', specialty: 'Інженерія програмного забезпечення', course: '4', arrivedOn: '', departedOn: '', responsiblePerson: c.assignment.supervisorName || '', schedule: [] };
    return { ...defaults, ...documentModel.find(kind, id) };
  },
  save(user, id, kind, data) {
    const c = this.context(user, id, kind);
    if (user.role !== 'student' || user.studentId !== c.assignment.studentId) throw ApiError.forbidden('Заповнювати документ може студент-власник');
    assertValid(validateDocument(kind, data, c.period));
    return documentModel.save(kind, id, data);
  },
  async generate(user, id, kind) {
    const c = this.context(user, id, kind);
    const data = this.get(user, id, kind);
    assertValid(validateDocument(kind, data, c.period, true));
    const input = { kind, data, ...c, entries: diaryModel.listByAssignment(id, 'asc') };
    return new Promise((resolve, reject) => {
      const child = spawn(process.env.PYTHON_BIN || 'python3', [script], { stdio: ['pipe', 'pipe', 'pipe'] });
      const chunks = []; let error = ''; let size = 0;
      const timer = setTimeout(() => child.kill(), 15000);
      child.stdout.on('data', b => { size += b.length; if (size > 20 * 1024 * 1024) child.kill(); else chunks.push(b); });
      child.stderr.on('data', b => { error += b.toString(); });
      child.stdin.on('error', () => {});
      child.on('error', () => { clearTimeout(timer); reject(new ApiError(503, 'Для експорту потрібен Python 3. Перевірте налаштування сервера.')); });
      child.on('close', code => { clearTimeout(timer); if (code === 0) resolve(Buffer.concat(chunks)); else { console.error('[docx]', error); reject(new ApiError(503, 'Не вдалося сформувати документ. Повторіть спробу.')); } });
      child.stdin.end(JSON.stringify(input));
    });
  },
};
