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
}