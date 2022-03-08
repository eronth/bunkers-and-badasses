export class RollBuilder {
  static _createDiceRollData(foundryObjs, dataOverride) {
    const actor = foundryObjs.actor;
    const item = foundryObjs.item;

    const level = actor.data.data.attributes.level;
    const vh_class = actor.data.data.class;
    const stats = actor.data.data.stats;
    const checks = actor.data.data.checks;
    const attributes = actor.data.data.attributes;
    const checksBonus = actor.data.data.bonus?.checks;
    const combatBonus = actor.data.data.bonus?.combat;

    const returnData = {
      actor: actor,

      // Stats
      acc: stats?.acc?.modToUse,
      accuracy: stats?.acc?.modToUse,
      accstat: stats?.acc?.value,
      accuracystat: stats?.acc?.value,
      accmod: stats?.acc?.mod,
      accuracymod: stats?.acc?.mod,

      dmg: stats?.dmg?.modToUse,
      damage: stats?.dmg?.modToUse,
      dmgstat: stats?.dmg?.value,
      damagestat: stats?.dmg?.value,
      dmgmod: stats?.dmg?.mod,
      damagemod: stats?.dmg?.mod,

      mst: stats?.mst?.modToUse,
      mastery: stats?.mst?.modToUse,
      mststat: stats?.mst?.value,
      masterystat: stats?.mst?.value,
      mstmod: stats?.mst?.mod,
      masterymod: stats?.mst?.mod,

      spd: stats?.spd?.modToUse,
      speed: stats?.spd?.modToUse,
      spdstat: stats?.spd?.value,
      speedstat: stats?.spd?.value,
      spdmod: stats?.spd?.mod,
      speedmod: stats?.spd?.mod,

      // Checks
      interact: checks?.interact?.total,
      interacttotal: checks?.interact?.total,
      interactmisc: checks?.interact?.misc,
      interacteffects: checksBonus?.interact,
      
      insight: checks?.insight?.total,
      insighttotal: checks?.insight?.total,
      insightmisc: checks?.insight?.misc,
      insighteffects: checksBonus?.insight,

      talk: checks?.talk?.total,
      talktotal: checks?.talk?.total,
      talkmisc: checks?.talk?.misc,
      talkeffects: checksBonus?.talk,

      traverse: checks?.traverse?.total,
      traversetotal: checks?.traverse?.total,
      traversemisc: checks?.traverse?.misc,
      traverseeffects: checksBonus?.traverse,

      sneak: checks?.sneak?.total,
      sneaktotal: checks?.sneak?.total,
      sneakmisc: checks?.sneak?.misc,
      sneakeffects: checksBonus?.sneak,

      search: checks?.search?.total,
      searchtotal: checks?.search?.total,
      searchmisc: checks?.search?.misc,
      searcheffects: checksBonus?.search,

      // Initiative check
      initiative: checks?.initiative?.total,
      initiativetotal: checks?.initiative?.total,
      initiativemisc: checks?.initiative?.misc,
      initiativeeffects: checksBonus?.initiative,

      // Movement values
      movement: checks?.movement?.total,
      movementtotal: checks?.movement?.total,
      movementmisc: checks?.movement?.misc,
      movementeffects: checksBonus?.movement,

      // Combat values
      melee: checks?.melee?.total,
      meleetotal: checks?.melee?.total,
      meleemisc: checks?.melee?.misc,
      meleeonlyeffects: combatBonus?.melee?.acc,
      meleeeffects: combatBonus?.melee?.acc + combatBonus?.attack?.acc,
      meleedice: vh_class?.meleeDice,
      meleedamage: attributes?.meleeDamage?.total,
      meleedamagetotal: attributes?.meleeDamage?.total,
      meleedamagebase: attributes?.meleeDamage?.value,
      meleedamagebonus: attributes?.meleeDamage?.bonus,
      meleedamageeffects: combatBonus?.melee?.dmg,


      shoot: checks?.shooting?.total,
      shooting: checks?.shooting?.total,

      shoottotal: checks?.shooting?.total,
      shootingtotal: checks?.shooting?.total,
      
      shootmisc: checks?.shooting?.misc,
      shootingmisc: checks?.shooting?.misc,
      
      shootonlyeffects: combatBonus?.shooting?.acc,
      shootingonlyeffects: combatBonus?.shooting?.acc,

      shooteffects: combatBonus?.shooting?.acc + combatBonus?.attack?.acc,
      shootingeffects: combatBonus?.shooting?.acc + combatBonus?.attack?.acc,
      
      shootbonusdmg: combatBonus?.shooting?.dmg,
      shootingbonusdmg: combatBonus?.shooting?.dmg,
      shootbonusdamage: combatBonus?.shooting?.dmg,
      shootingbonusdamage: combatBonus?.shooting?.dmg,


      throw: checks?.throw?.total,
      throwtotal: checks?.throw?.total,
      throwmisc: checks?.throw?.misc,
      throweffects: checksBonus?.throw,

      // Levels
      lv: level,
      lvl: level,
      level: level,
      badasslv: attributes?.badass?.rank,
      badasslvl: attributes?.badass?.rank,
      badasslevel: attributes?.badass?.rank,
      badassrank: attributes?.badass?.rank,

      ...dataOverride
    };

    return returnData;
  }
}
