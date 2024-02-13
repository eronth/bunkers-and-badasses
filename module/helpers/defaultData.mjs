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
}