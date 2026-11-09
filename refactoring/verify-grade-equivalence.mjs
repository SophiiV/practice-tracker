// Додаткова перевірка: початковий і новий алгоритми дають однакові результати
// для всіх допустимих пар цілих оцінок. Запуск із Проєкт:
// node refactoring/verify-grade-equivalence.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { GradeCalculator } from '../backend/src/patterns/grades/GradeCalculator.js';

// Використовуємо саме збережений код ДО змін як еталон.
const original = fs.readFileSync(new URL('before/gradeService.js', import.meta.url), 'utf8');
const scale = original.match(/const SCALE = \[[\s\S]*?\];/)[0];
const calculate = original.match(/calculate\(enterpriseGrade, teacherGrade\) \{([\s\S]*?)\n  \},/)[1];
const before = vm.runInNewContext(`${scale}\n(enterpriseGrade, teacherGrade) => {${calculate}}`);
const after = new GradeCalculator();
let compared = 0;
for (let enterprise = 0; enterprise <= 100; enterprise++) {
  for (let teacher = 0; teacher <= 100; teacher++) {
    const expected = JSON.parse(JSON.stringify(before(enterprise, teacher)));
    assert.deepEqual(after.calculate(enterprise, teacher), expected);
    compared++;
  }
}
const result = {
  date: new Date().toISOString().slice(0, 10),
  status: 'PASS', comparedPairs: compared,
  inputDomain: 'All integer enterpriseGrade and teacherGrade values from 0 through 100',
  comparedFields: ['finalScore', 'ectsGrade', 'nationalGrade'],
  reference: 'refactoring/before/gradeService.js (original SCALE and calculate body)',
  implementation: 'backend/src/patterns/grades/GradeCalculator.js (default strategy)',
  mismatches: 0,
  note: 'Additional exhaustive comparison, not included in npm test test count.',
};
fs.writeFileSync(new URL('evidence/grade-equivalence.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(`PASS: ${compared} пар оцінок, 0 розбіжностей у балах і шкалах.`);
