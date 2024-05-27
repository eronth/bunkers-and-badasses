import { MixedDiceAndNumber } from "./MixedDiceAndNumber.mjs";
import { genericUtil } from "./genericUtil.mjs";

export class DefaultData {

  static damageTypeEntries(options) {
    const damageTypes = genericUtil.getAllDamageTypes(options);
    const retVal = {};
    for (let damageType of damageTypes) {
      retVal[damageType] = {
        enabled: false,
        damage: 0,
      };
    }
    return retVal;
  }

  static archetypeLevelBonusTotals() {  
    return {
      skillPoints: 0,
      feats: [],
      bonuses: [],
      hps: { 
        flesh: { max: 0, regen: MixedDiceAndNumber.default() },
        armor: { max: 0, regen: MixedDiceAndNumber.default() },
        shield: { max: 0, regen: MixedDiceAndNumber.default() },
        eridian: { max: 0, regen: MixedDiceAndNumber.default() },
        bone: { max: 0, regen: MixedDiceAndNumber.default() },
      },
      stats: {
        acc: 0,
        dmg: 0,
        spd: 0,
        mst: 0,
      },
      maxPotions: 0,
      maxGrenades: 0,
      maxFavoredGuns: 0,
      bonusDamage: {
        elements: {
          kinetic: MixedDiceAndNumber.default(),
          other: MixedDiceAndNumber.default(),
        },
        anyAttack: MixedDiceAndNumber.default(),
        meleeAttack: MixedDiceAndNumber.default(),
        shootingAttack: MixedDiceAndNumber.default(),
        grenade: MixedDiceAndNumber.default(),
        perHit: MixedDiceAndNumber.default(),
        perCrit: MixedDiceAndNumber.default(),
        ifAnyCrit: MixedDiceAndNumber.default(),
        onNat20: MixedDiceAndNumber.default(),
      },
    };
  }

  static barBrawlResourceBars(flags) {
    const resourceReturn = {};

    const barDefaults = this._barBrawlBarCommonSettings();
    if (flags.bone) {
      resourceReturn.barBone = {
        ...barDefaults,
        id: 'barBone',
        order: 0,
        maxcolor: '#bbbbbb',
        mincolor: '#333333',
        attribute: 'attributes.hps.bone',
      };
    }
    if (flags.flesh) {
      resourceReturn.bar1 = {
        ...barDefaults,
        id: 'barFlesh',
        order: 1,
        maxcolor: '#d23232',
        mincolor: '#a20b0b',
        attribute: 'attributes.hps.flesh',
      };
    }
    if (flags.armor) {
      resourceReturn.barArmor = {
        ...barDefaults,
        id: 'barArmor',
        order: 2,
        maxcolor: '#ffdd00',
        mincolor: '#e1cc47',
        attribute: 'attributes.hps.armor',
      };
    }
    if (flags.shield) {
      resourceReturn.bar2 = {
        ...barDefaults,
        id: 'barShield',
        order: 3,
        maxcolor: '#24e7eb',
        mincolor: '#79d1d2',
        attribute: 'attributes.hps.shield',
      };
    }
    if (flags.eridian) {
      resourceReturn.barEridian = {
        ...barDefaults,
        id: 'barEridian',
        order: 4,
        maxcolor: '#ff00ff',
        mincolor: '#bb00bb',
        attribute: 'attributes.hps.eridian',
      };
    }

    return resourceReturn;
  }

  static _barBrawlBarCommonSettings() {
    return {
      style: 'user',
      position: 'top-outer',
      otherVisibility: CONST.TOKEN_DISPLAY_MODES.HOVER,
      ownerVisibility: CONST.TOKEN_DISPLAY_MODES.ALWAYS
    };
  }

  static npcAction(options) {
    return {
      name: options?.name ?? "",
      description: `<p>${options?.description ?? ""}</p>`,
    };
  }

}