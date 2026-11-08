// Спільний контракт форм і серверної валідації. Дані студента й періоду беруться з направлення.
export const documentFields = {
  contract: [
    ['number', 'Номер договору', 30, true], ['city', 'Місто укладання', 40, true],
    ['signedOn', 'Дата укладання', 10, true, 'date'],
    ['enterpriseName', 'Повна назва бази практики', 100, true],
    ['representative', 'Посада та ПІБ представника бази', 100, true],
    ['authority', 'Підстава повноважень представника', 100, true],
    ['address', 'Адреса бази практики', 120, true], ['email', 'Електронна пошта бази', 80, true, 'email'],
    ['course', 'Курс', 1, true], ['specialty', 'Галузь, спеціальність та освітня програма', 180, true],
    ['validUntil', 'Договір діє до', 10, true, 'date'], ['additionalTerms', 'Додаткові умови', 180, false],
  ],
  diary: [
    ['faculty', 'Інститут або факультет', 100, true], ['department', 'Кафедра', 100, true],
    ['qualification', 'Освітній рівень', 60, true], ['educationProgram', 'Освітня програма', 120, true],
    ['specialty', 'Спеціальність', 120, true], ['course', 'Курс', 1, true],
    ['arrivedOn', 'Фактична дата прибуття', 10, false, 'date'],
    ['departedOn', 'Фактична дата вибуття', 10, false, 'date'],
    ['responsiblePerson', 'Посада та ПІБ відповідальної особи бази', 100, false],
  ],
};
