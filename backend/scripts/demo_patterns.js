// Безпечна демонстрація ЛР12: не імпортує db.js і не змінює робочі дані.
import { GradeCalculator } from '../src/patterns/grades/GradeCalculator.js';
import { AverageGradeStrategy, WeightedGradeStrategy } from '../src/patterns/grades/GradeStrategies.js';
import { ContractDocumentCreator, DiaryDocumentCreator } from '../src/patterns/documents/DocumentCreators.js';

console.log('Strategy: однаковий виклик calculate(80, 95), різні алгоритми');
for (const strategy of [new AverageGradeStrategy(), new WeightedGradeStrategy(0.4, 0.6)]) {
  console.log(strategy.constructor.name, new GradeCalculator(strategy).calculate(80, 95));
}
console.log('У gradeService.save() залишається AverageGradeStrategy; ваги 40/60 — навчальний приклад.');

const context = {
  assignment: { supervisorName: 'Керівник практики' },
  enterprise: { name: 'Демонстраційна компанія', address: 'м. Івано-Франківськ' },
  period: { startDate: '2025-11-03', endDate: '2025-11-30' },
};
console.log('\nFactory Method: спільний getData(), різні createDocument()');
for (const creator of [new ContractDocumentCreator(), new DiaryDocumentCreator()]) {
  console.log(`${creator.constructor.name} → ${creator.createDocument().constructor.name}`);
  console.log(creator.getData(context));
}
