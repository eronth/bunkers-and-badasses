/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class BNBActor extends Actor {

  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the basic actor data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as ability modifiers rather than ability scores) and should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    const actorData = this.data;
    const data = actorData.data;
    const flags = actorData.flags.bnb || {};

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== 'character') return;

    // Make modifications to data here. For example:
    const data = actorData.data;

    var archetypeStats = data.archetypes.archetype1.baseStats;
    var classStats = data.class.baseStats;

    // Handle stat values and totals. Values are class+archetype. Totals are *everything*.
    data.stats.acc.value = archetypeStats.acc + classStats.acc + data.stats.acc.bonus;
    data.stats.acc.mod = Math.floor(data.stats.acc.value / 2);
    data.stats.dmg.value = archetypeStats.dmg + classStats.dmg + data.stats.dmg.bonus;
    data.stats.dmg.mod = Math.floor(data.stats.dmg.value / 2);
    data.stats.spd.value = archetypeStats.spd + classStats.spd + data.stats.spd.bonus;
    data.stats.spd.mod = Math.floor(data.stats.spd.value / 2);
    data.stats.mst.value = archetypeStats.mst + classStats.mst + data.stats.mst.bonus;
    data.stats.mst.mod = Math.floor(data.stats.mst.value / 2);

    // Prepare data for various check rolls.
    Object.entries(data.checks).forEach(entry => {
      const [check, checkData] = entry;
      checkData.value = data.stats[checkData.stat].value;
      checkData.total = (checkData.useBadassRank ? data.attributes.badassRank.value : 0) +
        (checkData.base ?? 0) + checkData.value + checkData.bonus;
    });
  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== 'npc') return;

    // Make modifications to data here. For example:
    const data = actorData.data;
    data.xp = (data.cr * data.cr) * 100;
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    const data = super.getRollData();

    // Prepare character roll data.
    this._getCharacterRollData(data);
    this._getNpcRollData(data);

    return data;
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    if (this.data.type !== 'character') return;

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    if (data.abilities) {
      for (let [k, v] of Object.entries(data.abilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    // Copy the stat scores to the top level, so that rolls can use
    // formulas like `@acc.mod + 4`.
    if (data.stats) {
      for (let [k, v] of Object.entries(data.stats)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    // Copy the stat scores to the top level, so that rolls can use
    // formulas like `@acc.mod + 4`.
    if (data.hps) {
      for (let [k, v] of Object.entries(data.hps)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    // Add level for easier access, or fall back to 0.
    if (data.attributes.level) {
      data.lvl = data.attributes.level.value ?? 0;
    }
  }

  /**
   * Prepare NPC roll data.
   */
  _getNpcRollData(data) {
    if (this.data.type !== 'npc') return;

    // Process additional NPC data here.
  }
}