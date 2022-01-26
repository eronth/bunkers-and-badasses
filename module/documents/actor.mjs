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

    const archetypeStats = data.archetypes.archetype1.baseStats;
    const classStats = data.class.baseStats;


    // Handle stat values and totals. Values are class+archetype. Totals are *everything*.
    Object.entries(data.stats).forEach(entry => {
      const [key, statData] = entry;
      statData.value = archetypeStats[key] + classStats[key] + statData.bonus;
      statData.mod = Math.floor(statData.value / 2)  + (statData.modBonus ?? 0);
      statData.modToUse = data.attributes.badassRollsEnabled ? statData.value : statData.mod;
    });

    // Prepare data for various check rolls.
    Object.entries(data.checks).forEach(entry => {
      const [check, checkData] = entry;
      checkData.value = data.stats[checkData.stat].modToUse;
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

  /**
   * Apply listeners to chat messages.
   * @param {HTML} html  Rendered chat message.
   */
  static addChatListeners(html) {
    html.on('click', '.chat-melee-damage-buttons button', this._onChatMeleeCardDamage.bind(this));
    //html.on('click', '.item-name', this._onChatCardToggleContent.bind(this));
  }

  static async _onChatMeleeCardDamage(event) {
    event.preventDefault();

    const dataSet = event.currentTarget.dataset;
    const actor = game.actors.get(dataSet.actorId);
    if (actor === null) return;
    const actorData = actor.data.data;

    const isPlusOneDice = dataSet.plusOneDice === 'true';
    const isDoubleDamage = dataSet.doubleDamage === 'true';
    const isCrit = dataSet.crit === 'true';

    // Prepare and roll the damage.
    const rollPlusOneDice = isPlusOneDice ? ` + ${actorData.class.meleeDice}` : '';
    const rollDoubleDamage = isDoubleDamage ? '2*' : '';
    const rollCrit = isCrit ? ' + 1d12' : '';
    const rollFormula = `${rollDoubleDamage}(${actorData.class.meleeDice}${rollPlusOneDice}${rollCrit} + @dmgMod)[Kinetic]`;
    const roll = new Roll(rollFormula, {
      actor: actor,
      dmgMod: actorData.stats.dmg.modToUse,
    });
    const rollResult = roll.roll();    
    
    // Convert roll to a results object for sheet display.
    const rollResults = {};
    rollResults.Kinetic = {
      formula: rollResult._formula,
      total: rollResult.total
    };

    const chatHtmlContent = await renderTemplate("systems/bunkers-and-badasses/templates/chat/damage-results.html", {
      results: rollResults
    });

    // Prep chat values.
    const flavorText = `${actor.name} deals a blow.`;
    const messageData = {
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: flavorText,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: rollResult,
      rollMode: CONFIG.Dice.rollModes.roll,
      content: chatHtmlContent,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u._id)
      speaker: ChatMessage.getSpeaker(),
    }
    
    return ChatMessage.create(messageData);
  };
}