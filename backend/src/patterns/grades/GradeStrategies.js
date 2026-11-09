// Strategy: кожен алгоритм має однаковий метод calculateFinalScore.
// Базовий клас описує контракт; у JavaScript окремого interface немає.
export class GradeStrategy {
  calculateFinalScore(enterpriseGrade, teacherGrade) {
    throw new Error('Стратегія має реалізувати calculateFinalScore');
  }
}

export class AverageGradeStrategy extends GradeStrategy {
  calculateFinalScore(enterpriseGrade, teacherGrade) {
    // Це початкова формула застосунку; округлення залишилося незмінним.
    return Math.round((Number(enterpriseGrade) + Number(teacherGrade)) / 2);
  }
}

export class WeightedGradeStrategy extends GradeStrategy {
  constructor(enterpriseWeight = 0.4, teacherWeight = 0.6) {
    super();
    if (![enterpriseWeight, teacherWeight].every(w => Number.isFinite(w) && w >= 0)
      || Math.abs(enterpriseWeight + teacherWeight - 1) > 1e-10) {
      throw new RangeError('Ваги мають бути невід’ємними числами із сумою 1');
    }
    this.enterpriseWeight = enterpriseWeight;
    this.teacherWeight = teacherWeight;
  }

  calculateFinalScore(enterpriseGrade, teacherGrade) {
    return Math.round(Number(enterpriseGrade) * this.enterpriseWeight
      + Number(teacherGrade) * this.teacherWeight);
  }
}
