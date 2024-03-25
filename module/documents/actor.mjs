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
    actor._prepareVaultHunterItemBonusesData();
    const archetypeStats = actor.system.archetypes.archetype1.baseStats;
    const archetypeLevelUpStats = actor.system.archetypeLevelBonusTotals?.stats;
    const classStats = actor.system.class.baseStats;

    // Handle stat values and totals. Values are class+archetype. Totals are *everything*.
    Object.entries(actor.system.stats).forEach(entry => {
      const [key, statData] = entry;
      statData.effects = actor.system.bonus.stats[key] ?? { value: 0, mod: 0 };
      statData.value = archetypeStats[key] + classStats[key] + statData.misc + statData.effects.value
      + (archetypeLevelUpStats ? archetypeLevelUpStats[key] : 0); //+ statData.itemBonus;
      statData.mod = Math.floor(statData.value / 2)  + (statData.modBonus ?? 0) + statData.effects.mod;
      statData.modToUse = actor.system.attributes.badass.rollsEnabled ? statData.value : statData.mod;
    });

    // Prepare data for various check rolls.
    Object.entries(actor.system.checks).forEach(entry => {
      const [check, checkData] = entry;
      checkData.value = actor.system.stats[checkData.stat].modToUse;

      // Copy the earlier derived item bonus values to the various checks.
      // Kinda makes you feel like the earlier derived data is a bit redundant.
      checkData.gear = actor.system.stats[checkData.stat]?.itemBonus ?? 0;
      
      // Determine effect bonus (shooting and melee are treated slightly different.)
      if (actor.system.bonus.checks[check] != null) {
        checkData.effects = actor.system.bonus.checks[check];
      } else if (actor.system.bonus.combat[check] != null) {
        checkData.effects = actor.system.bonus.combat[check].acc;
        checkData.effects += actor.system.bonus.combat.attack.acc;
      } else {
        checkData.effects = 0;
      }
      
      checkData.total = (checkData.usesBadassRank ? actor.system.attributes.badass.rank : 0) +
        (checkData.base ?? 0) + checkData.value + checkData.gear + checkData.misc + checkData.effects;
    });
  }
  
  _prepareVaultHunterItemBonusesData() {
    // ArchetypeLevelBonuses => alb
    //const actor = actorData;
    const actor = this;
    const archetypeLevelItems = [];
    const inHandGuns = [];

    // Quickly grab all of the level up items.
    actor.items.forEach(i => {
      if (i.type === 'Archetype Level') {
        archetypeLevelItems.push(i);
      } else if (i.type === 'gun') {
        if (i.system.equipped && i.system.inHand) {
          inHandGuns.push(i);
        }
      }
    });

    // Create the totals object and apply the bonuses from level up.
    const albTotals = DefaultData.archetypeLevelBonusTotals();
    archetypeLevelItems.forEach(i => {
      this._applyArchetypeLevelToTotal({ ablt: albTotals, i: i });
    });

    // Apply the totals to the actor's system data.
    actor.system.archetypeLevelBonusTotals = {...albTotals};


    // Handle bonuses from guns.
    actor.system.stats.acc.itemBonus = 0;
    actor.system.stats.dmg.itemBonus = 0;
    actor.system.stats.spd.itemBonus = 0;
    actor.system.stats.mst.itemBonus = 0;
    inHandGuns.forEach(i => {
      const modBonus = i.system.statMods;
      actor.system.stats.acc.itemBonus += modBonus.acc;
      actor.system.stats.dmg.itemBonus += modBonus.dmg;
      actor.system.stats.spd.itemBonus += modBonus.spd;
      actor.system.stats.mst.itemBonus += modBonus.mst;
    });
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
    MixedDiceAndNumber.applyBonusToMixed({ mixed: ablt.hps.flesh.regen, additionalBonus: itemHps.flesh.regen });
    MixedDiceAndNumber.applyBonusToMixed({ mixed: ablt.hps.armor.regen, additionalBonus: itemHps.armor.regen });
    MixedDiceAndNumber.applyBonusToMixed({ mixed: ablt.hps.shield.regen, additionalBonus: itemHps.shield.regen });
    MixedDiceAndNumber.applyBonusToMixed({ mixed: ablt.hps.eridian.regen, additionalBonus: itemHps.eridian.regen });
    MixedDiceAndNumber.applyBonusToMixed({ mixed: ablt.hps.bone.regen, additionalBonus: itemHps.bone.regen });

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
    const bonusDamage = ablt.bonusDamage;
    MixedDiceAndNumber.applyBonusToMixed({ mixed: bonusDamage.elements.kinetic, additionalBonus: itemBonusDamage.elements.kinetic });
    MixedDiceAndNumber.applyBonusToMixed({ mixed: bonusDamage.elements.other, additionalBonus: itemBonusDamage.elements.other });
    MixedDiceAndNumber.applyBonusToMixed({ mixed: bonusDamage.anyAttack, additionalBonus: itemBonusDamage.anyAttack });
    MixedDiceAndNumber.applyBonusToMixed({ mixed: bonusDamage.meleeAttack, additionalBonus: itemBonusDamage.meleeAttack });
    MixedDiceAndNumber.applyBonusToMixed({ mixed: bonusDamage.shootingAttack, additionalBonus: itemBonusDamage.shootingAttack });
    MixedDiceAndNumber.applyBonusToMixed({ mixed: bonusDamage.grenade, additionalBonus: itemBonusDamage.grenade });
    MixedDiceAndNumber.applyBonusToMixed({ mixed: bonusDamage.perHit, additionalBonus: itemBonusDamage.perHit });
    MixedDiceAndNumber.applyBonusToMixed({ mixed: bonusDamage.perCrit, additionalBonus: itemBonusDamage.perCrit });
    MixedDiceAndNumber.applyBonusToMixed({ mixed: bonusDamage.ifAnyCrit, additionalBonus: itemBonusDamage.ifAnyCrit });
    MixedDiceAndNumber.applyBonusToMixed({ mixed: bonusDamage.onNat20, additionalBonus: itemBonusDamage.onNat20 });
    
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
   * Special actor handler functions
  **/
  attackFavoredReasons(options) {
    const actor = this;
    const { item, attackElements } = options;
    const favoredBy = {
      itemTypes: new Set(),
      elements: new Set(),
    };
    
    const favored = actor.system.favored;
    if (item.system?.special?.overrideType === 'snotgun') {
      favoredBy.itemTypes.add((actor.system.favored.sniper ? 'sniper' : 'shotgun'));
    } else if (favored[item.system.type.value]) {
      favoredBy.itemTypes.add(item.system.type.value);
    }

    const itemPerHitElements = item.system.elements;
    Object.entries(itemPerHitElements).forEach(entry => {
      const [key, value] = entry;
      if (value.enabled) {
        if (favored[key]) {
          favoredBy.elements.add(key);
        }
      }
    });

    const itemPerAttackElements = item.system.bonusElements;
    Object.entries(itemPerAttackElements).forEach(entry => {
      const [key, value] = entry;
      if (value.enabled) {
        if (favored[key]) {
          favoredBy.elements.add(key);
        }
      }
    });

    // For now, I don't want to do this.
    // attackElements.forEach(element => {
    //   if (favored[element]) {
    //     favoredBy.elements.add(element);
    //   }
    // });

    return favoredBy;
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
  };
}