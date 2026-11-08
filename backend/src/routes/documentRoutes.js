import { Router } from 'express';
import { fileURLToPath } from 'node:url';
import { documentService } from '../services/documentService.js';
export const materialRoutes = Router();
const files = { 'safety.pdf': 'Інструктаж_ТБ.pdf', 'contract.docx': 'Договір_бланк.docx', 'diary.docx': 'Щоденник_бланк.docx' };
for (const [file, name] of Object.entries(files)) materialRoutes.get('/' + file, (req, res) => {
  const target = fileURLToPath(new URL('../../templates/' + file, import.meta.url));
  if (file === 'safety.pdf' && req.query.download !== '1') res.sendFile(target);
  else res.download(target, name);
});
export const documentRoutes = Router();
documentRoutes.get('/:id/:kind', (req, res) => res.json(documentService.get(req.user, Number(req.params.id), req.params.kind)));
documentRoutes.put('/:id/:kind', (req, res) => res.json(documentService.save(req.user, Number(req.params.id), req.params.kind, req.body)));
documentRoutes.get('/:id/:kind/download', async (req, res, next) => {
  try {
    const buffer = await documentService.generate(req.user, Number(req.params.id), req.params.kind);
    const name = `${req.params.kind === 'contract' ? 'Договір' : 'Щоденник'}_${req.params.id}.docx`;
    res.set('Cache-Control', 'no-store');
    res.attachment(name).type('application/vnd.openxmlformats-officedocument.wordprocessingml.document').send(buffer);
  } catch (e) { next(e); }
});
