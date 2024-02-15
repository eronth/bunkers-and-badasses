export class MixedDiceAndNumber {

  static default() {
    return { num: 0, texts: [] };
  }

  static addMixedToMixed(options) {
    const { mixed, additionalMixed } = options;

    mixed.num += Number(additionalMixed.num ?? 0);
    mixed.texts.push(...(additionalMixed.texts ?? []));
  }

  static applyBonusToMixed(options) {
    const { mixed,  additionalBonus } = options;

    if (!additionalBonus) { return; }

    if (isNaN(additionalBonus)) {
      mixed.texts.push(additionalBonus);
    } else {
      mixed.num += Number(additionalBonus ?? 0);
    }
  }

  static mixedToString(options) {
    const { mixed, numberLocation } = options;
    const num = Number(mixed.num ?? 0) > 0
      ? mixed.num
      : '';
    const texts = mixed.texts ?? [];

    if (num === 0 && texts.length === 0) { return ''; }

    const isSeparatorNeeded = mixed.texts.length > 0 && mixed.num > 0;
    const separator = isSeparatorNeeded ? ' + ' : '';

    return (numberLocation === 'start'
      ? `${num}${separator}${texts.join(' + ')}`
      : `${texts.join(' + ')}${separator}${num}`
    );
  }

}