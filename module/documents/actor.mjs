import { RollBuilder } from "../helpers/roll-builder.mjs";
import { BarbrawlBuilder } from "../helpers/barbrawl-builder.mjs";
import { ConfirmActionPrompt } from "../helpers/roll-and-post/confirmActionPrompt.mjs";
import { DefaultData } from "../helpers/defaultData.mjs";
import { MixedDiceAndNumber } from "../helpers/MixedDiceAndNumber.mjs";

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

    // // Values for flags.
    // const initTokenFlags = {
    //   // Values to use for barbrawl's benefit.
    //   barbrawl: this.preCreateBarbrawlHealthBars(data, gameFlags)
    // }

    // Assemble the initial token data values.
    const initTokenData = {
      token: {
        ...initTokenBars,
        dimSight: 15,
        vision: (this.type === 'vault hunter'),
        actorLink: (this.type === 'vault hunter'),
        //flags: {...initTokenFlags},
      }
    };
    // Update actor's token.
    this.prototypeToken.updateSource(initTokenData.token);

    this.preCreateActionSkilItem();
  }

  // preCreateBarbrawlHealthBars(data, gameFlags) {
  //   const initTokenBars = (BarbrawlBuilder.buildResourceBars(gameFlags));
  //   return {
  //     'resourceBars': {...initTokenBars} 
  //   };
  // }

  /// Creates the default action skill item for the actor.
  preCreateActionSkilItem() {
    // Prepare item data.
    const newActionSkillItemData = {
      name: 'Action Skill',
      type: 'Action Skill',
      img: 'icons/svg/clockwork.svg',
      //system: {...itemSystemData}
    };
    const item = new CONFIG.Item.documentClass(newActionSkillItemData);
    this.updateSource({ items: [item.toObject()] });
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
    this._prepareVaultHunterBaseData();
    this._prepareNpcBaseData();
  }

  _prepareVaultHunterBaseData() {
    if (this.type !== 'vault hunter') return;
  }

  _prepareNpcBaseData() {
    if (this.type !== 'npc') return;
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
    const actorData = this;
    const flags = actorData.flags.bnb || {};

    // Make separate methods for each Actor type (vault hunter, npc, etc.) to keep
    // things organized.
    this._prepareVaultHunterDerivedData(actorData);
    this._prepareNpcDerivedData(actorData);
  }

  /**
   * Prepare Vault Hunter type specific data
   */
  _prepareVaultHunterDerivedData(actorData) {
    if (actorData.type !== 'vault hunter') return;
    const actor = actorData;

    // Run a quick update to make sure data from previous versions matches current expected version..
    this._updateVaultHunterDataVersions(actorData);

    // Pull basic data into easy-to-access variables.
    actor._prepareVaultHunterArchetypeLevelBonusesData();
    const actorSystem = actorData.system;
    const archetypeStats = actorSystem.archetypes.archetype1.baseStats;
    const archetypeLevelUpStats = actorSystem?.archetypeLevelBonusTotals?.stats;
    const classStats = actorSystem.class.baseStats;

    // Handle stat values and totals. Values are class+archetype. Totals are *everything*.
    Object.entries(actorSystem.stats).forEach(entry => {
      const [key, statData] = entry;
      statData.effects = actorSystem.bonus.stats[key] ?? { value: 0, mod: 0 };
      statData.value = archetypeStats[key] + classStats[key] + statData.misc + statData.effects.value
      + (archetypeLevelUpStats ? archetypeLevelUpStats[key] : 0);
      statData.mod = Math.floor(statData.value / 2)  + (statData.modBonus ?? 0) + statData.effects.mod;
      statData.modToUse = actorSystem.attributes.badass.rollsEnabled ? statData.value : statData.mod;
    });

    // Prepare data for various check rolls.
    Object.entries(actorSystem.checks).forEach(entry => {
      const [check, checkData] = entry;
      checkData.value = actorSystem.stats[checkData.stat].modToUse;
      
      // Determine effect bonus (shooting and melee are treated slightly different.)
      if (actorSystem.bonus.checks[check] != null) {
        checkData.effects = actorSystem.bonus.checks[check];
      } else if (actorSystem.bonus.combat[check] != null) {
        checkData.effects = actorSystem.bonus.combat[check].acc;
        checkData.effects += actorSystem.bonus.combat.attack.acc;
      } else {
        checkData.effects = 0;
      }
      
      checkData.total = (checkData.usesBadassRank ? actorSystem.attributes.badass.rank : 0) +
        (checkData.base ?? 0) + checkData.value + checkData.misc + checkData.effects;
    });

    
  }
  
  _prepareVaultHunterArchetypeLevelBonusesData() {
    // ArchetypeLevelBonuses => alb
    //const actor = actorData;
    const actor = this;
    const archetypeLevelItems = [];

    // Quickly grab all of the level up items.
    actor.items.forEach(i => {
      if (i.type === 'Archetype Level') {
        archetypeLevelItems.push(i);
      }
    });

    // Create the totals object and apply the bonuses from level up.
    const albTotals = DefaultData.archetypeLevelBonusTotals();
    archetypeLevelItems.forEach(i => {
      this._applyArchetypeLevelToTotal({ ablt: albTotals, i: i });
    });

    // Apply the totals to the actor's system data.
    actor.system.archetypeLevelBonusTotals = {...albTotals};
  }

  _applyArchetypeLevelToTotal(options) {
    const { ablt, i } = options;
    const itemHps = i.system.hps;
    const itemStats = i.system.stats;
    const itemBonusDamage = i.system.bonusDamage;

    // Add the bonuses to the totals.
    ablt.skillPoints += Number(i.system.skillPoints);
    if (i.system.feat) { ablt.feats.push(i.system.feat); }

    // Add the hps to the totals.
    ablt.hps.flesh.max += Number(itemHps.flesh.max);
    ablt.hps.armor.max += Number(itemHps.armor.max);
    ablt.hps.shield.max += Number(itemHps.shield.max);
    ablt.hps.eridian.max += Number(itemHps.eridian.max);
    ablt.hps.bone.max += Number(itemHps.bone.max);

    // Add the regens to the totals.
    MixedDiceAndNumber.applyBonusToMixed({ mixed: ablt.regens.flesh, additionalBonus: itemHps.flesh.regen });
    MixedDiceAndNumber.applyBonusToMixed({ mixed: ablt.regens.armor, additionalBonus: itemHps.armor.regen });
    MixedDiceAndNumber.applyBonusToMixed({ mixed: ablt.regens.armor, additionalBonus: itemHps.shield.regen });
    MixedDiceAndNumber.applyBonusToMixed({ mixed: ablt.regens.eridian, additionalBonus: itemHps.eridian.regen });
    MixedDiceAndNumber.applyBonusToMixed({ mixed: ablt.regens.bone, additionalBonus: itemHps.bone.regen });

    // Add the stats to the totals.
    ablt.stats.acc += Number(itemStats.acc);
    ablt.stats.dmg += Number(itemStats.dmg);
    ablt.stats.spd += Number(itemStats.spd);
    ablt.stats.mst += Number(itemStats.mst);

    // Add max to some attribute items.
    ablt.maxPotions += Number(i.system.maxPotions);
    ablt.maxGrenades += Number(i.system.maxGrenades);
    ablt.maxFavoredGuns += Number(i.system.maxFavoredGuns);
    
    // Add the bonus damage to the totals.
    ablt.bonusDamage.elements.kinetic += Number(itemBonusDamage.elements.kinetic);
    ablt.bonusDamage.elements.other += Number(itemBonusDamage.elements.other);
    ablt.bonusDamage.anyAttack += Number(itemBonusDamage.anyAttack);
    ablt.bonusDamage.meleeAttack += Number(itemBonusDamage.meleeAttack);
    ablt.bonusDamage.shootingAttack += Number(itemBonusDamage.shootingAttack);
    ablt.bonusDamage.grenade += Number(itemBonusDamage.grenade);
    ablt.bonusDamage.perHit += Number(itemBonusDamage.perHit);
    ablt.bonusDamage.perCrit += Number(itemBonusDamage.perCrit);
    ablt.bonusDamage.ifAnyCrit += Number(itemBonusDamage.ifAnyCrit);
    ablt.bonusDamage.onNat20 += Number(itemBonusDamage.onNat20);
    if (i.system.bonus) { ablt.bonuses.push(i.system.bonus); }
  }

  async _updateVaultHunterDataVersions(actorData) {
    if (this.type !== 'vault hunter') return;

    if (!actorData?.system?.checks?.throw) {
      actorData.system.checks.throw = {
        stat: "acc",
        value: 0,
        misc: 0
      };
      // Square brackets needed to get the right value.
      const archetypeRewardsLabel = "system.checks.throw";
      this.update({[archetypeRewardsLabel]: actorData.system.checks.throw});
    }
  }
  
  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcDerivedData(actorData) {
    if (actorData.type !== 'npc') return;

    // const hps = actorData.system.attributes.hps;
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
    if (this.type !== 'vault hunter') return;

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
    if (this.type !== 'npc') return;

    // Process additional NPC data here.
  }

  /**
   * Apply listeners to chat messages.
   * @param {HTML} html  Rendered chat message.
   */
  static addChatListeners(html) {
    html.on('click', '.chat-melee-damage-buttons button', this._onChatCardDamage.bind(this));
    html.on('click', '.chat-damage-buttons button', this._onChatCardDamage.bind(this));
  }

  static async _onChatCardDamage(event) {
    event.preventDefault();

    const dataset = event.currentTarget.dataset;
    const attackType = dataset.attackType;
    const actor = game.actors.get(dataset.actorId);
    if (actor === null) return;
    const item = (attackType != 'melee') 
      ? actor.items.get(dataset.itemId)
      : null;
    
    const damageOptions = {
      actor: actor,
      item: item,
      dataset: dataset
    };

    if (attackType.toLowerCase() === 'melee') {
      return ConfirmActionPrompt.dealMeleeDamage(event, damageOptions);
    } else if (attackType.toLowerCase() === 'shooting') {
      return ConfirmActionPrompt.dealShootingDamage(event, damageOptions);
    } else if (attackType.toLowerCase() === 'grenade') {
      return ConfirmActionPrompt.dealGrenadeDamage(event, damageOptions);
    }

    // const actorSystem = actor.system;
    // const archetypeBonusDamages = actorSystem?.archetypeLevelBonusTotals?.bonusDamage;

    // const levelUpDamage = (0
    //   + (archetypeBonusDamages?.anyAttack ?? 0)
    //   + ((dataSet.attackType === 'shooting') ? (archetypeBonusDamages?.shootingAttack ?? 0) : 0)
    //   + ((dataSet.attackType === 'melee') ? (archetypeBonusDamages?.meleeAttack ?? 0) : 0)
    //   + ((dataSet.attackType === 'grenade') ? (archetypeBonusDamages?.grenade ?? 0) : 0)
    //   + ((archetypeBonusDamages?.perHit ?? 0) * (dataSet.hits ?? 0))
    //   + ((archetypeBonusDamages?.perCrit ?? 0) * (dataSet.crits ?? 0))
    //   + (dataSet.crits ? (archetypeBonusDamages?.ifAnyCrit ?? 0) : 0)
    //   // TODO add a way to know if the attack is elemental or not.
    //   // + (isNonElemental ? (archetypeBonusDamages?.elements?.kinetic ?? 0) : 0)
    //   // + (isElemental ? (archetypeBonusDamages?.elements?.other ?? 0) : 0)
    //   + (dataSet.critHit ? (archetypeBonusDamages?.onNat20 ?? 0) : 0)
    // );

    // const isPlusOneDice = dataSet.plusOneDice === 'true';
    // const isDoubleDamage = dataSet.doubleDamage === 'true';
    // const isCrit = dataSet.crit === 'true';

    // // Prepare and roll the damage.
    // const rollPlusOneDice = isPlusOneDice ? ` + ${actorSystem.class.meleeDice}` : '';
    // const rollDoubleDamage = isDoubleDamage ? '2*' : '';
    // const effectDamage = (actorSystem?.bonus?.combat?.melee?.dmg ?? 0) + (actorSystem?.bonus?.combat?.attack?.dmg ?? 0);
    // const critEffectDamage = (actorSystem?.bonus?.combat?.melee?.critdmg ?? 0) + (actorSystem?.bonus?.combat?.attack?.critdmg ?? 0);
    // const rollCrit = (isCrit ? ' + 1d12[Crit]' : '') 
    //   + ((isCrit && critEffectDamage > 0) 
    //     ? ` + ${critEffectDamage}[Crit Effects]` 
    //     : '');
    // const rollFormula = `${rollDoubleDamage}`
    //  + `(`
    //    + `${actorSystem.class?.meleeDice ?? '0d0'}${rollPlusOneDice}${rollCrit} + @dmg[DMG ${actorSystem.attributes.badass.rollsEnabled ? 'Stat' : 'Mod'}] `
    //    + ((effectDamage > 0) ? `+ ${effectDamage}[Melee Dmg Effects]` : '')
    //  + `)[Kinetic]`;
    // const roll = new Roll(
    //   rollFormula,
    //   RollBuilder._createDiceRollData({actor: actor})
    // );
    // const rollResult = await roll.roll({async: true});    
    
    // // Convert roll to a results object for sheet display.
    // const rollResults = {};
    // rollResults["Kinetic"] = {
    //   formula: rollResult._formula,
    //   total: rollResult.total
    // };

    // const templateLocation = 'systems/bunkers-and-badasses/templates/chat/damage-results.html';
    // const chatHtmlContent = await renderTemplate(templateLocation, {
    //   results: rollResults,
    //   imageOverride: 'systems/bunkers-and-badasses/assets/elements/melee/Melee-Kinetic.png'
    // });

    // // Prep chat values.
    // const flavorText = `${actor.name} deals a blow.`;
    // const messageData = {
    //   user: game.user.id,
    //   speaker: ChatMessage.getSpeaker({ actor: actor }),
    //   flavor: flavorText,
    //   type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    //   roll: rollResult,
    //   rollMode: CONFIG.Dice.rollModes.publicroll,
    //   content: chatHtmlContent,
    //   // whisper: game.users.entities.filter(u => u.isGM).map(u => u.id)
    //   speaker: ChatMessage.getSpeaker(),
    // }

    // return rollResult.toMessage(messageData);
  };
}