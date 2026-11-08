import { db, get, run, all } from '../db.js';
import { documentFields } from '../../../shared/documentFields.js';
const TABLES = { contract: 'practice_contracts', diary: 'diary_documents' };
export const documentModel = {
  find(kind, id) {
    const row = get(`SELECT * FROM ${TABLES[kind]} WHERE assignment_id = ?`, id);
    if (!row) return null;
    const result = Object.fromEntries(documentFields[kind].map(([key]) => [key, row[key]]));
    result.updatedAt = row.updated_at;
    if (kind === 'diary') result.schedule = all('SELECT title, start_date AS startDate, end_date AS endDate, completed FROM diary_schedule WHERE assignment_id = ? ORDER BY position', id).map(r => ({ ...r, completed: !!r.completed }));
    return result;
  },
  save(kind, id, data) {
    const keys = documentFields[kind].map(([k]) => k);
    db.exec('BEGIN');
    try {
      run(`INSERT INTO ${TABLES[kind]} (assignment_id, ${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')}, ?)
        ON CONFLICT(assignment_id) DO UPDATE SET ${keys.map(k => `${k}=excluded.${k}`).join(',')}, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`, id, ...keys.map(k => (data[k] ?? '').trim()));
      if (kind === 'diary') {
        run('DELETE FROM diary_schedule WHERE assignment_id = ?', id);
        (data.schedule ?? []).forEach((r, i) => run('INSERT INTO diary_schedule (assignment_id,position,title,start_date,end_date,completed) VALUES (?,?,?,?,?,?)', id, i, r.title.trim(), r.startDate, r.endDate, r.completed ? 1 : 0));
      }
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
    return this.find(kind, id);
  },
};
