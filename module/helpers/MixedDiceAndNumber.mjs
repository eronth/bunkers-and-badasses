export class MixedDiceAndNumber {

  static default() {
    return { num: 0, texts: [] };
  }

  static addMixedToMixed(options) {
    const { mixed, additionalMixed } = options;

    mixed.num += (additionalMixed.num ?? 0);
    mixed.texts.push(...(additionalMixed.texts ?? []));
  }

  static applyBonusToMixed(options) {
    const { mixed,  additionalBonus } = options;

    if (!additionalBonus) { return; }

    if (isNaN(additionalBonus)) {
      mixed.texts.push(additionalBonus);
    } else {
      mixed.num += additionalBonus;
    }
  }

}