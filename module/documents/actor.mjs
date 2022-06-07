import { RollBuilder } from "../helpers/roll-builder.mjs";

/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class BNBActor extends Actor {

  async _preCreate(data, options, user) {
    // Default health values for actor.
    const initTokenBars = {
      bar2: { attribute: 'attributes.hps.shield' },
      bar1: { attribute: 'attributes.hps.flesh' }
    };

    const gameFlags = {
      useArmor: (data.type == 'npc'
        ? true
        : game.settings.get('bunkers-and-badasses', 'usePlayerArmor')),
      useBone: (data.type == 'npc' 
        ? game.settings.get('bunkers-and-badasses', 'useNpcBone')
        : game.settings.get('bunkers-and-badasses', 'usePlayerBone')),
      useEridian: (data.type == 'npc'
        ? game.settings.get('bunkers-and-badasses', 'useNpcEridian')
        : game.settings.get('bunkers-and-badasses', 'usePlayerEridian')),
      useFlesh: true,
      useShield: true
    };

    // Values for flags.
    const initTokenFlags = {
      // Values to use for barbrawl's benefit.
      barbrawl: this.preCreateBarbrawlHealthBars(data, gameFlags)
    }

    // Assemble the initial token data.
    const initTokenData = {
      token: {
        ...initTokenBars,
        dimSight: 15,
        vision: (this.type === 'vault hunter'),
        actorLink: (this.type === 'vault hunter'),
        flags: {...initTokenFlags},
      }
    };

    // Update actor's token.
    this.data.update(initTokenData);
  }

  preCreateBarbrawlHealthBars(data, gameFlags) {
    const visibleBarDefaults = {
      'position': 'top-inner',
      'otherVisibility': CONST.TOKEN_DISPLAY_MODES.HOVER,
      'ownerVisibility': CONST.TOKEN_DISPLAY_MODES.ALWAYS
    };
    
    let barbrawlOrder = 0;
    const initTokenBarbrawlBars = { };
    if (gameFlags.useEridian) {
      initTokenBarbrawlBars['barEridian'] = {
        'id': 'barEridian',
        'order': barbrawlOrder++,
        'maxcolor': '#ff00ff',
        'mincolor': '#bb00bb',
        'attribute': 'attributes.hps.eridian',
        ...visibleBarDefaults,
      };
    }
    if (gameFlags.useShield) {
      initTokenBarbrawlBars['bar2'] = { // Shield
        // 'barShield': {
        // 'id': 'barShield',
        'id': 'bar2',
        'order': barbrawlOrder++,
        'maxcolor': '#24e7eb',
        'mincolor': '#79d1d2',
        'attribute': 'attributes.hps.shield',
        ...visibleBarDefaults
      };
    }
    if (gameFlags.useArmor) {
      initTokenBarbrawlBars['barArmor'] = {
        'id': 'barArmor',
        'order': barbrawlOrder++,
        'maxcolor': '#ffdd00',
        'mincolor': '#e1cc47',
        'attribute': 'attributes.hps.armor',
        ...visibleBarDefaults
      };
    }
    if (gameFlags.useFlesh) {
      initTokenBarbrawlBars['bar1'] = { // Flesh
        // 'barFlesh': {
        //   'id': 'barFlesh',
        'id': 'bar1',
        'order': barbrawlOrder++,
        'maxcolor': '#d23232',
        'mincolor': '#a20b0b',
        'attribute': 'attributes.hps.flesh',
        ...visibleBarDefaults
      };
    }
    if (gameFlags.useBone) {
      initTokenBarbrawlBars['barBone'] = {
        'id': 'barBone',
        'order': barbrawlOrder++,
        'maxcolor': '#bbbbbb',
        'mincolor': '#333333',
        'attribute': 'attributes.hps.bone',
        ...visibleBarDefaults
      };
    }
    
    return { 
      resourceBars: {...initTokenBarbrawlBars} 
    };
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

    // Run a quick update to make sure data from previous versions matches current expected version..
    this._updateVaultHunterDataVersions(actorData);

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
        checkData.effects += data.bonus.combat.attack.acc;
      } else {
        checkData.effects = 0;
      }
      
      checkData.total = (checkData.usesBadassRank ? data.attributes.badass.rank : 0) +
        (checkData.base ?? 0) + checkData.value + checkData.misc + checkData.effects;
    });
  }

  _updateVaultHunterDataVersions(actorData) {
    if (!actorData?.data?.checks?.throw) {
      actorData.data.checks.throw = {
        stat: "acc",
        value: 0,
        misc: 0
      };
      // Square brackets needed to get the right value.
      const archetypeRewardsLabel = "data.checks.throw";
      this.update({[archetypeRewardsLabel]: actorData.data.checks.throw});
    }
    
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
    const effectDamage = (actorData?.bonus?.combat?.melee?.dmg ?? 0) + (actorData?.bonus?.combat?.attack?.dmg ?? 0);
    const critEffectDamage = (actorData?.bonus?.combat?.melee?.critdmg ?? 0) + (actorData?.bonus?.combat?.attack?.critdmg ?? 0);
    const rollCrit = (isCrit ? ' + 1d12[Crit]' : '') 
      + ((isCrit && critEffectDamage > 0) 
        ? ` + ${critEffectDamage}[Crit Effects]` 
        : '');
    const rollFormula = `${rollDoubleDamage}`
     + `(`
       + `${actorData.class?.meleeDice ?? '0d0'}${rollPlusOneDice}${rollCrit} + @dmg[DMG ${actorData.attributes.badass.rollsEnabled ? 'Stat' : 'Mod'}] `
       + ((effectDamage > 0) ? `+ ${effectDamage}[Melee Dmg Effects]` : '')
     + `)[Kinetic]`;
    const roll = new Roll(
      rollFormula,
      RollBuilder._createDiceRollData({actor: actor})
    );
    const rollResult = await roll.roll();    
    
    // Convert roll to a results object for sheet display.
    const rollResults = {};
    rollResults["kinetic"] = {
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