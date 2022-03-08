import { RollBuilder } from "../helpers/roll-builder.mjs";

/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class BNBActor extends Actor {

  async _preCreate(data, options, user) {
    if ( this.type === 'vault hunter' ) {
      
      // Establish the default values for the actor's token.
      const initTokenData = {
        bar2: { attribute: 'attributes.hps.shield' },
        bar1: { attribute: 'attributes.hps.flesh' },
        vision: true,
        actorLink: true,
      }
      this.data.update(initTokenData);
    } else if ( this.type === 'npc' ) {
      const actorData = this.data;
      const hps = actorData.data.attributes.hps;

      const initTokenData = {
        "token.bar2": { "attribute": "attributes.hps.shield" },
        "token.bar1": { "attribute": "attributes.hps.flesh" },
        "token.bar3": { "attribute": "attributes.hps.armor" },
      }
      // TODO this is kinda bad, so the logic should revisited later.
      // This tries to evaluate which health should be used for the healthbars.
      // Flesh, if used, is bar1. Then armor, then shield.
      if (!this._isHpValuePopulated(hps.flesh)) {
        if (this._isHpValuePopulated(hps.shield) && this._isHpValuePopulated(hps.armor)) {
          initTokenData["token.bar1"] = { "attribute": "attributes.hps.armor" };
          initTokenData["token.bar2"] = { "attribute": "attributes.hps.shield" };
        }
      } else if (!this._isHpValuePopulated(hps.shield) && this._isHpValuePopulated(hps.armor)) {
        initTokenData["token.bar2"] = { "attribute": "attributes.hps.armor" };
      }
      this.data.update(initTokenData);
    }
  }

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
    super.prepareBaseData();
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
    super.prepareDerivedData();
    const actorData = this.data;
    const data = actorData.data;
    const flags = actorData.flags.bnb || {};

    // Make separate methods for each Actor type (vault hunter, npc, etc.) to keep
    // things organized.
    this._prepareVaultHunterData(actorData);
    this._prepareNpcData(actorData);
  }

  /**
   * Prepare Vault Hunter type specific data
   */
  _prepareVaultHunterData(actorData) {
    if (actorData.type !== 'vault hunter') return;

    // Pull basic data into easy-to-access variables.
    const data = actorData.data;
    const archetypeStats = data.archetypes.archetype1.baseStats;
    const classStats = data.class.baseStats;

    // Handle stat values and totals. Values are class+archetype. Totals are *everything*.
    Object.entries(data.stats).forEach(entry => {
      const [key, statData] = entry;
      statData.effects = data.bonus.stats[key] ?? { value: 0, mod: 0 };
      statData.value = archetypeStats[key] + classStats[key] + statData.misc + statData.effects.value;
      statData.mod = Math.floor(statData.value / 2)  + (statData.modBonus ?? 0) + statData.effects.mod;
      statData.modToUse = data.attributes.badass.rollsEnabled ? statData.value : statData.mod;
    });

    // Prepare data for various check rolls.
    Object.entries(data.checks).forEach(entry => {
      const [check, checkData] = entry;
      checkData.value = data.stats[checkData.stat].modToUse;
      
      // Determine effect bonus (shooting and melee are treated slightly different.)
      if (data.bonus.checks[check] != null) {
        checkData.effects = data.bonus.checks[check];
      } else if (data.bonus.combat[check] != null) {
        checkData.effects = data.bonus.combat[check].acc;
      } else {
        checkData.effects = 0;
      }
      
      checkData.total = (checkData.usesBadassRank ? data.attributes.badass.rank : 0) +
        (checkData.base ?? 0) + checkData.value + checkData.misc + checkData.effects;
    });
  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== 'npc') return;

    // const hps = actorData.data.attributes.hps;
  }

  _isHpValuePopulated(hpData) {
    return (hpData.value != null && hpData.value !== 0) || (hpData.max != null && hpData.max !== 0);
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    const data = super.getRollData();

    // Prepare vault hunter roll data.
    this._getVaultHunterRollData(data);
    this._getNpcRollData(data);

    return data;
  }

  /**
   * Prepare vault hunter roll data.
   */
  _getVaultHunterRollData(data) {
    if (this.data.type !== 'vault hunter') return;

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
    const rollFormula = `${rollDoubleDamage}(${actorData.class.meleeDice}${rollPlusOneDice}${rollCrit} + @dmg[DMG ${actorData.attributes.badass.rollsEnabled ? 'Stat' : 'Mod'}] + @meleedamageeffects[Bonus])[Kinetic]`;
    const roll = new Roll(
      rollFormula,
      RollBuilder._createDiceRollData({actor: actor})
    );
    const rollResult = await roll.roll();    
    
    // Convert roll to a results object for sheet display.
    const rollResults = {};
    rollResults.Kinetic = {
      formula: rollResult._formula,
      total: rollResult.total
    };

    const templateLocation = 'systems/bunkers-and-badasses/templates/chat/damage-results.html';
    const chatHtmlContent = await renderTemplate(templateLocation, {
      results: rollResults
    });

    // Prep chat values.
    const flavorText = `${actor.name} deals a blow.`;
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: flavorText,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: rollResult,
      rollMode: CONFIG.Dice.rollModes.publicroll,
      content: chatHtmlContent,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u.id)
      speaker: ChatMessage.getSpeaker(),
    }

    return rollResult.toMessage(messageData);
  };
  
  
}