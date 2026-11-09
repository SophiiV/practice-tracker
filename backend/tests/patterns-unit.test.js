// Модульні перевірки патернів: без сервера, бази та сторонніх пакетів.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GradeCalculator } from '../src/patterns/grades/GradeCalculator.js';
import { GradeStrategy, AverageGradeStrategy, WeightedGradeStrategy } from '../src/patterns/grades/GradeStrategies.js';
import { PracticeDocument, ContractDocument, DiaryDocument } from '../src/patterns/documents/PracticeDocuments.js';
import { DocumentCreator, ContractDocumentCreator, DiaryDocumentCreator, getDocumentCreator } from '../src/patterns/documents/DocumentCreators.js';

const context = {
  assignment: { supervisorName: 'Керівник підприємства' },
  enterprise: { name: 'Тестова компанія', address: 'м. Івано-Франківськ' },
  period: { startDate: '2025-11-03', endDate: '2025-11-30' },
};

test('PU-01: середнє зберігає округлення і перетворення числових рядків', () => {
  assert.equal(new AverageGradeStrategy().calculateFinalScore('90', '85'), 88);
  assert.equal(new AverageGradeStrategy().calculateFinalScore(0, 1), 1);
});

test('PU-02: усі 10 201 цілочислові пари 0–100 збігаються з початковою формулою', () => {
  const calculator = new GradeCalculator();
  for (let enterprise = 0; enterprise <= 100; enterprise++) {
    for (let teacher = 0; teacher <= 100; teacher++) {
      assert.equal(calculator.calculate(enterprise, teacher).finalScore,
        Math.round((enterprise + teacher) / 2));
    }
  }
});

test('PU-03: збережено обидві сторони кожної межі ECTS', () => {
  const calculator = new GradeCalculator();
  const cases = [[0, 'F'], [34, 'F'], [35, 'FX'], [49, 'FX'], [50, 'E'], [59, 'E'],
    [60, 'D'], [69, 'D'], [70, 'C'], [79, 'C'], [80, 'B'], [89, 'B'], [90, 'A'], [100, 'A']];
  const national = { F: 'незадовільно', FX: 'незадовільно', E: 'задовільно', D: 'задовільно', C: 'добре', B: 'добре', A: 'відмінно' };
  for (const [score, ects] of cases) {
    assert.deepEqual(calculator.calculate(score, score), {
      finalScore: score, ectsGrade: ects, nationalGrade: national[ects],
    });
  }
});

test('PU-04: підміна стратегії змінює результат через той самий контекст', () => {
  assert.equal(new GradeCalculator().calculate(80, 95).finalScore, 88);
  assert.equal(new GradeCalculator(new WeightedGradeStrategy()).calculate(80, 95).finalScore, 89);
});

test('PU-05: зважена стратегія підтримує інші коректні ваги', () => {
  assert.equal(new WeightedGradeStrategy(0.25, 0.75).calculateFinalScore(80, 100), 95);
  assert.equal(new WeightedGradeStrategy(1, 0).calculateFinalScore(80, 100), 80);
});

test('PU-06: некоректні ваги не створюють стратегію', () => {
  for (const weights of [[-0.1, 1.1], [0.4, 0.4], [NaN, 1], [Infinity, 0], ['0.4', 0.6]]) {
    assert.throws(() => new WeightedGradeStrategy(...weights), RangeError);
  }
});

test('PU-07: нова стратегія працює без зміни GradeCalculator', () => {
  class LowerGradeStrategy extends GradeStrategy {
    calculateFinalScore(a, b) { return Math.min(a, b); }
  }
  assert.equal(new GradeCalculator(new LowerGradeStrategy()).calculate(80, 95).finalScore, 80);
});

test('PU-08: неправильний контракт і абстрактні методи дають зрозумілі помилки', () => {
  assert.throws(() => new GradeCalculator({ calculate: () => 100 }), TypeError);
  assert.throws(() => new GradeStrategy().calculateFinalScore(80, 95), /calculateFinalScore/);
  assert.throws(() => new DocumentCreator().createDocument(), /createDocument/);
  assert.throws(() => new PracticeDocument('sample').defaults(context), /defaults/);
});

test('PU-09: конкретні творці повертають різні продукти спільного базового типу', () => {
  const contract = new ContractDocumentCreator().createDocument();
  const diary = new DiaryDocumentCreator().createDocument();
  assert.ok(contract instanceof ContractDocument && contract instanceof PracticeDocument);
  assert.ok(diary instanceof DiaryDocument && diary instanceof PracticeDocument);
  assert.equal(contract.kind, 'contract');
  assert.equal(diary.kind, 'diary');
});

test('PU-10: збережені дані перекривають defaults, а масиви чернеток незалежні', () => {
  const contract = new ContractDocumentCreator().getData(context, { city: 'Львів' });
  assert.equal(contract.city, 'Львів');
  assert.equal(contract.enterpriseName, context.enterprise.name);
  assert.equal(contract.email, '');
  const creator = new DiaryDocumentCreator();
  creator.getData(context).schedule.push({ title: 'Не має потрапити в інший документ' });
  assert.deepEqual(creator.getData(context).schedule, []);
  assert.equal(creator.getData(context).responsiblePerson, context.assignment.supervisorName);
});

test('PU-11: успадкований сценарій Creator викликає фабричний метод нового підкласу', () => {
  // Не змінюємо DocumentCreator: новий тип підставляється перевизначенням методу.
  const calls = [];
  class SampleCreator extends DocumentCreator {
    createDocument() {
      calls.push('factory');
      return {
        defaults: () => ({ title: 'Зразок' }),
        validate: (data, period, forExport) => { calls.push(forExport); return {}; },
        generationInput: (c, data, entries) => ({ kind: 'sample', data, entries }),
      };
    }
  }
  assert.deepEqual(new SampleCreator().prepareGeneration(context, { title: 'Новий' }, []), {
    kind: 'sample', data: { title: 'Новий' }, entries: [],
  });
  assert.deepEqual(calls, ['factory', true]);
});

test('PU-12: спільний сценарій дозволяє чернетку і перевіряє повноту перед експортом', () => {
  const creator = new ContractDocumentCreator();
  assert.doesNotThrow(() => creator.validate({}, context.period));
  assert.throws(() => creator.prepareGeneration(context, {}, []), error => {
    assert.equal(error.status, 422);
    assert.ok(error.details.number && error.details.validUntil);
    return true;
  });
});

test('PU-13: реєстр обирає творця і відхиляє невідомі типи, включно з ключами прототипу', () => {
  assert.ok(getDocumentCreator('contract') instanceof ContractDocumentCreator);
  assert.ok(getDocumentCreator('diary') instanceof DiaryDocumentCreator);
  for (const kind of ['unknown', 'constructor', '__proto__']) {
    assert.throws(() => getDocumentCreator(kind), error => error.status === 404);
  }
});
