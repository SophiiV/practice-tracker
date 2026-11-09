import { ContractDocument, DiaryDocument } from './PracticeDocuments.js';
import { assertValid } from '../../utils/validate.js';
import { ApiError } from '../../utils/ApiError.js';

// Factory Method: підкласи визначають, який Product створити.
// Спільний сценарій залишається в Creator і працює через методи Product.
export class DocumentCreator {
  createDocument() {
    throw new Error('Творець має реалізувати фабричний метод createDocument');
  }

  getData(context, saved = {}) {
    const document = this.createDocument();
    return { ...document.defaults(context), ...saved };
  }

  validate(data, period, forExport = false) {
    const document = this.createDocument();
    assertValid(document.validate(data, period, forExport));
  }

  prepareGeneration(context, saved, entries) {
    const document = this.createDocument();
    const data = { ...document.defaults(context), ...saved };
    assertValid(document.validate(data, context.period, true));
    return document.generationInput(context, data, entries);
  }
}

export class ContractDocumentCreator extends DocumentCreator {
  createDocument() { return new ContractDocument(); }
}

export class DiaryDocumentCreator extends DocumentCreator {
  createDocument() { return new DiaryDocument(); }
}

// Реєстр лише обирає Creator. Сам фабричний метод — це createDocument вище.
const creators = new Map([
  ['contract', new ContractDocumentCreator()],
  ['diary', new DiaryDocumentCreator()],
]);

export function getDocumentCreator(kind) {
  const creator = creators.get(kind);
  if (!creator) throw ApiError.notFound('Тип документа не знайдено');
  return creator;
}
