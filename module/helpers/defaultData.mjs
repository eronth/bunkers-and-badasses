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
        flesh: { max: 0 },
        armor: { max: 0 },
        shield: { max: 0 },
        eridian: { max: 0 },
        bone: { max: 0 },
      },
      regens: {
        flesh: { num: 0, texts: [], },
        armor: { num: 0, texts: [], },
        shield: { num: 0, texts: [], },
        bone: { num: 0, texts: [], },
        eridian: { num: 0, texts: [], },
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
          kinetic: 0,
          other: 0
        },
        anyAttack: 0,
        meleeAttack: 0,
        shootingAttack: 0,
        grenade: 0,
        perHit: 0,
        perCrit: 0,
        ifAnyCrit: 0,
        onNat20: 0,
      },
    };
  }

  static barBrawlResourceBars() {
    const barDefaults = this._barBrawlBarCommonSettings();
    return {
      barBone: {
        ...barDefaults,
        id: 'barBone',
        order: 0,
        maxcolor: '#bbbbbb',
        mincolor: '#333333',
        attribute: 'attributes.hps.bone',
      },
      bar1: {
        ...barDefaults,
        id: 'bar1',
        order: 1,
        maxcolor: '#d23232',
        mincolor: '#a20b0b',
        attribute: 'attributes.hps.flesh',
      },
      barArmor: {
        ...barDefaults,
        id: 'barArmor',
        order: 2,
        maxcolor: '#ffdd00',
        mincolor: '#e1cc47',
        attribute: 'attributes.hps.armor',
      },
      bar2: {
        ...barDefaults,
        id: 'bar2',
        order: 3,
        maxcolor: '#24e7eb',
        mincolor: '#79d1d2',
        attribute: 'attributes.hps.shield',
      },
      barEridian: {
        ...barDefaults,
        id: 'barEridian',
        order: 4,
        maxcolor: '#ff00ff',
        mincolor: '#bb00bb',
        attribute: 'attributes.hps.eridian',
      }
    };
  }

  static _barBrawlBarCommonSettings() {
    return {
      style: 'user',
      position: 'top-outer',
      otherVisibility: CONST.TOKEN_DISPLAY_MODES.HOVER,
      ownerVisibility: CONST.TOKEN_DISPLAY_MODES.ALWAYS
    };
  }

}