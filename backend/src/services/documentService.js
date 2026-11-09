import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { assignmentService } from './assignmentService.js';
import { documentModel } from '../models/documentModel.js';
import { studentModel, teacherModel } from '../models/userModel.js';
import { enterpriseModel, periodModel } from '../models/enterpriseModel.js';
import { diaryModel } from '../models/diaryModel.js';
import { ApiError } from '../utils/ApiError.js';
import { getDocumentCreator } from '../patterns/documents/DocumentCreators.js';
const script = fileURLToPath(new URL('../../scripts/fill_document.py', import.meta.url));
export const documentService = {
  context(user, id, kind) {
    getDocumentCreator(kind); // Перевірка підтримуваного типу до читання направлення.
    const assignment = assignmentService.getById(user, id);
    return { assignment, student: studentModel.findById(assignment.studentId), teacher: teacherModel.findById(assignment.teacherId), enterprise: enterpriseModel.findById(assignment.enterpriseId), period: periodModel.findById(assignment.periodId) };
  },
  get(user, id, kind) {
    const c = this.context(user, id, kind);
    return getDocumentCreator(kind).getData(c, documentModel.find(kind, id));
  },
  save(user, id, kind, data) {
    const c = this.context(user, id, kind);
    if (user.role !== 'student' || user.studentId !== c.assignment.studentId) throw ApiError.forbidden('Заповнювати документ може студент-власник');
    getDocumentCreator(kind).validate(data, c.period);
    return documentModel.save(kind, id, data);
  },
  async generate(user, id, kind) {
    const c = this.context(user, id, kind);
    const input = getDocumentCreator(kind).prepareGeneration(
      c, documentModel.find(kind, id), diaryModel.listByAssignment(id, 'asc'),
    );
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
