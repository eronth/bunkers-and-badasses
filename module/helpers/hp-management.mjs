export class HpManagement {

  static applyBonusToRegen(options) {
    const { hpRegen,  additionalRegen } = options;

    if (!additionalRegen) { return; }

    if (isNaN(additionalRegen)) {
      hpRegen.texts.push(additionalRegen);
    } else {
      hpRegen.num += additionalRegen;
    }
  }

}