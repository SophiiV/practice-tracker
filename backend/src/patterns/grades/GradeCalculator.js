import { AverageGradeStrategy } from './GradeStrategies.js';

// Поточна навчальна шкала застосунку. Межі збережено з початкової реалізації.
const SCALE = [
  { min: 90, ects: 'A', national: 'відмінно' },
  { min: 80, ects: 'B', national: 'добре' },
  { min: 70, ects: 'C', national: 'добре' },
  { min: 60, ects: 'D', national: 'задовільно' },
  { min: 50, ects: 'E', national: 'задовільно' },
  { min: 35, ects: 'FX', national: 'незадовільно' },
  { min: 0, ects: 'F', national: 'незадовільно' },
];

export class GradeCalculator {
  constructor(strategy = new AverageGradeStrategy()) {
    if (!strategy || typeof strategy.calculateFinalScore !== 'function') {
      throw new TypeError('Потрібна стратегія з методом calculateFinalScore');
    }
    this.strategy = strategy;
  }

  calculate(enterpriseGrade, teacherGrade) {
    // Контекст не знає формули: він викликає спільний метод стратегії.
    const finalScore = this.strategy.calculateFinalScore(enterpriseGrade, teacherGrade);
    const row = SCALE.find(s => finalScore >= s.min);
    return { finalScore, ectsGrade: row.ects, nationalGrade: row.national };
  }
}
