// Модель бази практики: таблиця enterprises.
import { all, get, run } from '../db.js';

const SQL = `
  SELECT id, name, address, phone, email,
         contract_number AS contractNumber, contract_date AS contractDate,
         is_active AS isActive
  FROM enterprises`;

// SQLite не має типу «логічний», тому 0/1 перетворюємо на false/true
const toDto = (row) => (row ? { ...row, isActive: Boolean(row.isActive) } : undefined);

export const enterpriseModel = {
  list: ({ sort, isActive } = {}) => {
    const where = isActive === undefined ? '' : ' WHERE is_active = ?';
    const order = sort === 'name' ? ' ORDER BY name' : ' ORDER BY id';
    const rows = isActive === undefined ? all(SQL + order) : all(SQL + where + order, isActive ? 1 : 0);
    return rows.map(toDto);
  },
  findById: (id) => toDto(get(`${SQL} WHERE id = ?`, id)),

  create: (d) => {
    const { lastInsertRowid } = run(
      `INSERT INTO enterprises (name, address, phone, email, contract_number, contract_date, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      d.name, d.address, d.phone ?? null, d.email ?? null,
      d.contractNumber ?? null, d.contractDate ?? null, d.isActive === false ? 0 : 1,
    );
    return enterpriseModel.findById(Number(lastInsertRowid));
  },

  update: (id, d) => {
    run(
      `UPDATE enterprises
       SET name = ?, address = ?, phone = ?, email = ?, contract_number = ?, contract_date = ?, is_active = ?
       WHERE id = ?`,
      d.name, d.address, d.phone ?? null, d.email ?? null,
      d.contractNumber ?? null, d.contractDate ?? null, d.isActive === false ? 0 : 1, id,
    );
    return enterpriseModel.findById(id);
  },

  remove: (id) => run('DELETE FROM enterprises WHERE id = ?', id),
  countAssignments: (id) => get('SELECT COUNT(*) AS cnt FROM assignments WHERE enterprise_id = ?', id).cnt,
};

const PERIOD_SQL = `
  SELECT id, type, academic_year AS academicYear, semester,
         start_date AS startDate, end_date AS endDate, hours
  FROM practice_periods`;

export const periodModel = {
  list: () => all(`${PERIOD_SQL} ORDER BY start_date`),
  findById: (id) => get(`${PERIOD_SQL} WHERE id = ?`, id),
  // Рядок таблиці без перейменування полів — потрібен валідації щоденника
  rawById: (id) => get('SELECT * FROM practice_periods WHERE id = ?', id),
};
