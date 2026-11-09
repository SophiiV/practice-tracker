import { validateDocument } from '../../utils/documentValidation.js';

// Product: договір і щоденник надають однакові операції, але різні дані.
export class PracticeDocument {
  constructor(kind) {
    this.kind = kind;
  }

  defaults(context) {
    throw new Error('Документ має реалізувати defaults');
  }

  validate(data, period, forExport = false) {
    return validateDocument(this.kind, data, period, forExport);
  }

  generationInput(context, data, entries) {
    return { kind: this.kind, data, ...context, entries };
  }
}

export class ContractDocument extends PracticeDocument {
  constructor() { super('contract'); }

  defaults(c) {
    return {
      number: '', city: 'Івано-Франківськ', signedOn: '',
      enterpriseName: c.enterprise.name, representative: '', authority: '',
      address: c.enterprise.address, email: c.enterprise.email || '',
      course: '4', specialty: '112 – «Інженерія програмного забезпечення»',
      validUntil: '', additionalTerms: '',
    };
  }
}

export class DiaryDocument extends PracticeDocument {
  constructor() { super('diary'); }

  defaults(c) {
    return {
      faculty: 'Факультет математики та інформатики',
      department: 'Інформаційних технологій', qualification: 'Бакалавр',
      educationProgram: 'Інженерія програмного забезпечення',
      specialty: 'Інженерія програмного забезпечення', course: '4',
      arrivedOn: '', departedOn: '',
      responsiblePerson: c.assignment.supervisorName || '', schedule: [],
    };
  }
}
