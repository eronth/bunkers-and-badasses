import { onManageActiveEffect, prepareActiveEffectCategories } from "../helpers/effects.mjs";
import { RollBuilder } from "../helpers/roll-builder.mjs";
import { Dropdown } from "../helpers/dropdown.mjs";
import { genericUtil } from "../helpers/genericUtil.mjs";
import { OnActionUtil } from "../helpers/onActionUtil.mjs";
import { PostToChat } from "../helpers/roll-and-post/postToChat.mjs";
import { ConfirmActionPrompt } from "../helpers/roll-and-post/confirmActionPrompt.mjs";
import { PerformRollAction } from "../helpers/roll-and-post/performRollAction.mjs";
import { DefaultData } from "../helpers/defaultData.mjs";
import { MixedDiceAndNumber } from "../helpers/MixedDiceAndNumber.mjs";
import { Enricher } from "../helpers/enricher.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class BNBActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["bnb", "sheet", "actor"],
      template: "systems/bunkers-and-badasses/templates/actor/actor-sheet.html",
      width: 600,
      height: 600,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "action" },
      { navSelector: ".builder-tabs", contentSelector: ".builder-body", initial: "levelUp" }]
    });
  }

  /** @override */
  get template() {
    return `systems/bunkers-and-badasses/templates/actor/actor-${this.actor.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = context.actor;

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = {
      ...actorData.flags,
      useArmor: (actorData.type == 'npc'
        ? true
        : game.settings.get('bunkers-and-badasses', 'usePlayerArmor')),
      useBone: (actorData.type == 'npc' 
        ? game.settings.get('bunkers-and-badasses', 'useNpcBone')
        : game.settings.get('bunkers-and-badasses', 'usePlayerBone')),
      useEridian: (actorData.type == 'npc'
        ? game.settings.get('bunkers-and-badasses', 'useNpcEridian')
        : game.settings.get('bunkers-and-badasses', 'usePlayerEridian')),
      useFlesh: true,
      useShield: true
    };

    context.potionCount = { value: 0, max: (actorData.system?.attributes?.potions?.max ?? 0) };
    context.maxGrenades = (actorData.system?.attributes?.grenades?.max ?? 0);
    
    // Prepare Vault Hunter data and items.
    if (actorData.type == 'vault hunter') {
      context.skillPoints = { value: 0, max: 0 };
      this._updateVaultHunterFromPreviousVersions(context);
      this._prepareItems(context);
      this._prepareArchetypeLevelBonuses(context);
      this._prepareArchetypes(context);
      this._prepareExperience(context);
      this._prepareVhHps(context);
      this._prepareActionSkill(context);
      this._prepareVaultHunterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == 'npc') {
      this._updateNPCFromPreviousVersions(context);
      this._prepareItems(context);
      this._prepareNpcHps(context);
    }

    context.isCollapsed = {...(this.actor.system.isCollapsed)};
    
    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();
    
    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);

    // This should be near the last thing to happen.
    await this._prepareEnrichedFields(context, actorData.type);
    
    return context;
  }

  async _updateVaultHunterFromPreviousVersions(context) {

    ///////////////////////////////////
    //////// Update from 0.1.3 ////////
    ///////////////////////////////////
    const actorHPs = this?.actor?.system?.attributes?.hps;
    const effectsHPs = this?.actor?.system?.bonus?.healths;

    ////////////  Update HP From Previous Versions  ////////////
    // This moves the "max" value to be treated as a "base" stat value.
    let healthUpdateHappened = false;
    let bonusHealthUpdateHappened = false;

    if (actorHPs != null && actorHPs.flesh.base == null) {
      actorHPs.flesh.base = actorHPs.flesh.max;
      actorHPs.flesh.max = 0;
      healthUpdateHappened = true;
    }
    if (actorHPs != null && actorHPs.shield.base == null) {
      actorHPs.shield.base = actorHPs.shield.max;
      actorHPs.shield.max = 0;
      healthUpdateHappened = true;
    }
    if (actorHPs != null && actorHPs.armor.base == null) {
      actorHPs.armor.base = actorHPs.armor.max;
      actorHPs.armor.max = 0;
      healthUpdateHappened = true;
    }
    
    // This adds previously missing HP attributes to the actor.
    if (actorHPs != null && actorHPs.bone == null) {
      actorHPs.bone = {
        "value": 0, "base": 0, "min": 0, "max": 0, "regen": 0
      }
      healthUpdateHappened = true;
    }
    if (effectsHPs != null && effectsHPs.bone == null) {
      effectsHPs.bone = { max: 0, regen: '' };
      bonusHealthUpdateHappened = true;
    }
    if (actorHPs != null && actorHPs.eridian == null) {
      actorHPs.eridian = {
        "value": 0, "base": 0, "min": 0, "max": 0, "regen": 0
      }
      healthUpdateHappened = true;
    }
    if (effectsHPs != null && effectsHPs.eridian == null) {
      effectsHPs.eridian = { max: 0, regen: '' };
      bonusHealthUpdateHappened = true;
    }

    if (healthUpdateHappened) {
      // Square brackets needed to get the right value.
      const attributeLabel = `system.attributes.hps`;
      this.actor.update({[attributeLabel]: actorHPs});
    }
    if (bonusHealthUpdateHappened) {
      // Square brackets needed to get the right value.
      const attributeLabel = `system.bonus.healths`;
      this.actor.update({[attributeLabel]: effectsHPs});
    }
    ////////////  Update HP From Previous Versions  ////////////
  }

  _updateNPCFromPreviousVersions(context) {
    ///////////////////////////////////
    //////// Update from 0.1.3 ////////
    ///////////////////////////////////
    const actorHPs = this?.actor?.system?.attributes?.hps;

    ////////////  Update HP From Previous Versions  ////////////
    let healthUpdateHappened = false;

    if (actorHPs != null && actorHPs.bone == null) {
      actorHPs.bone = {
        "value": 0, "base": 0, "min": 0, "max": 0, "regen": 0
      }
      healthUpdateHappened = true;
    }
    if (actorHPs != null && actorHPs.eridian == null) {
      actorHPs.eridian = {
        "value": 0, "base": 0, "min": 0, "max": 0, "regen": 0
      }
      healthUpdateHappened = true;
    }
    
    if (healthUpdateHappened) {
      // Square brackets needed to get the right value.
      const attributeLabel = `system.attributes.hps`;
      this.actor.update({[attributeLabel]: actorHPs});
    }
  }

  _prepareActionSkill(context) {
    if (context.actionSkills == null || context.actionSkills[0] == null) { return; }

    const actor = context.actor;
    const actionSkill = context.actionSkills[0];
    const actionSkillName = actionSkill.name;
    const actionSkillUses = {
      value: actor.system.class.actionSkill.uses.value,
      max: actionSkill.system.bonusUses + actor.system.stats.mst.mod,
    };
    context.actionSkillName = actionSkillName;
    context.actionSkillId = actionSkill._id;
    context.actionSkillUses = actionSkillUses;
  }

  _prepareArchetypes(context) {
    const actorSystem = context.system;
    // Not much transformation to do here. This is primarily to make the values accessible.
    context.archetype1 = actorSystem.archetypes.archetype1;
    context.archetype2 = actorSystem.archetypes.archetype2;
  }
  
  _prepareExperience(context) {
    const actorSystem = context.system;

    // First, start with the book provided cutoffs.
    const experiencePerSegmentCutoffs = this._getExperiencePerSegmentCutoffsList();
    
    // Next, use the cutoffs to determine individual exp required to reach each next level.
    const experienceReqs = this._generateExperienceRequirements();
    
    // Total up the experience gained for the vault hunter and set xp.total value.
    let totalXpGained = 0;
    (actorSystem.attributes.xp.gains).forEach(expBit => {
      totalXpGained += expBit.value;
    });
    // TODO temporary override until I figure out a cleaner way to manage XP gains popup.
    totalXpGained = actorSystem.attributes.xp.value; 
    actorSystem.attributes.xp.total = totalXpGained;

    // Loop through the thresholds. Find the one where we have enough XP to to be that level
    // but not enough leftover to be higher.
    Object.entries(experienceReqs).forEach(entry => {
      const [level, req] = entry;
      if (totalXpGained >= req.toHitThisLevel) {
        const leftoverXP = totalXpGained - req.toHitThisLevel;
        if (leftoverXP < req.toHitNextLevel || level == '30') {
          actorSystem.attributes.level = level;
          actorSystem.attributes.xp.level = level; // I fucked up and tracked the level in two places.
          // Track current experience in the current level... just in case.
          actorSystem.attributes.xp.soFarInLevel = leftoverXP;
          actorSystem.attributes.xp.currentSegment = 
            Math.ceil((leftoverXP+1)/experiencePerSegmentCutoffs[level]);
          actorSystem.attributes.xp.XpPerSegment = experiencePerSegmentCutoffs[level];
        }
      }
    });

    // Make it easier to access the experience values.
    const xpData = context.xp = actorSystem.attributes.xp;

    // Calculate the percentage completion of each xp segment
    // for progress bar rendering via handlebars.
    const xpSegmentPercents = new Array(10).fill(0);
    xpSegmentPercents.forEach((segment, index, xpSegmentPercents) => {
      if (xpData.level == '30') {
        xpSegmentPercents[index] = 100;
      } else if ((index+1) < xpData.currentSegment) {
        xpSegmentPercents[index] = 100;
      } else if ((index+1) > xpData.currentSegment) {
        xpSegmentPercents[index] = 0;
      } else {
        // We should only be here when the segment is the currently active one.
        const xpInThisSegment = xpData.soFarInLevel - (xpData.XpPerSegment * (index)); // not index+1 because we need to remove the xp from before that, not including it.
        // Modify to % value.
        xpSegmentPercents[index] = 100 * xpInThisSegment / xpData.XpPerSegment;
        xpData.soFarInSegment = xpInThisSegment;
      }
    });

    xpData.xpSegmentPercents = xpSegmentPercents;
  }

  _getExperiencePerSegmentCutoffsList() {
    return { // Hardcoded list because I am so good at coding and stuff.
      1: 100, 2: 100, 3: 100,
      4: 150, 5: 150,
      6: 200, 7: 200, 8: 200,
      9: 250, 10: 250,
      11: 300, 12: 300, 13: 300,
      14: 350, 15: 350,
      16: 400, 17: 400, 18: 400,
      19: 450, 20: 450,
      21: 500, 22: 500, 23: 500,
      24: 550, 25: 550,
      26: 600, 27: 600, 28: 600,
      29: 650, 30: 650
    };
  }

  _generateExperienceRequirements() {
    const experiencePerSegmentCutoffs = this._getExperiencePerSegmentCutoffsList();

    const experienceReqs = {};
    let totalExpRequiredSoFar = 0;

    Object.entries(experiencePerSegmentCutoffs).forEach(entry => {
      const [level, cutoff] = entry;
      experienceReqs[level] = { toHitThisLevel: 0, toHitNextLevel: 0 };
      experienceReqs[level].toHitThisLevel = totalExpRequiredSoFar;
      experienceReqs[level].toHitNextLevel = cutoff * 10;
      totalExpRequiredSoFar += cutoff * 10; // Increment this for the next loop.
    });

    return {...experienceReqs};
  }

  _prepareArchetypeLevelBonuses(context) {
    const archetypeLevelItems = [...(context.archetype1Levels ?? []), ...(context.archetype2Levels ?? [])];

    // Add up all the bonuses from the archetype levels.
    archetypeLevelItems.forEach(i => {
      context.skillPoints.max += Number(i.system.maxPotions);
      context.potionCount.max += Number(i.system.maxGrenades);
      context.maxGrenades += Number(i.system.maxFavoredGuns);
    });
  }

  _prepareVhHps(context) {
    const actorHPs = this.actor.system.attributes.hps;
    const oldActorHPs = JSON.parse(JSON.stringify(actorHPs));
    const effectsHPs = this.actor.system.bonus.healths;
    const doArchetypeBonusesExist = !genericUtil.isNullOrEmptyObject(this.actor.system.archetypeLevelBonusTotals);
    const archetypeLevelBonusTotals = ((doArchetypeBonusesExist) ? this.actor.system.archetypeLevelBonusTotals : DefaultData.archetypeLevelBonusTotals());
    const archetypeHPs = archetypeLevelBonusTotals.hps;
    //const archetypeRegens = archetypeLevelBonusTotals.regens;

    // Clean slate for HPs totals.
    actorHPs.flesh.max = actorHPs.armor.max = actorHPs.shield.max = actorHPs.bone.max = actorHPs.eridian.max = 0;
    actorHPs.flesh.combinedRegen = actorHPs.armor.combinedRegen = actorHPs.shield.combinedRegen 
      = actorHPs.bone.combinedRegen = actorHPs.eridian.combinedRegen = "";
    const combinedRegen = {
      flesh: MixedDiceAndNumber.default(),
      armor: MixedDiceAndNumber.default(),
      shield: MixedDiceAndNumber.default(),
      eridian: MixedDiceAndNumber.default(),
      bone: MixedDiceAndNumber.default(),
    }
    
    // Get the HPs from the actor items (Shields and Archetype Levels.)
    Object.entries(context.items).forEach(entry => {
      const [itemIndex, itemData] = entry;
      if (itemData.type === "shield" && itemData.system.equipped) {
        actorHPs[itemData.system.healthType].max += itemData.system.capacity ?? 0;
        MixedDiceAndNumber.applyBonusToMixed({ 
          mixed: combinedRegen[itemData.system.healthType],
          additionalBonus: itemData.system.recoveryRate
        });
      }
    });

    // Add bonuses from Builder Tab and effects.
    Object.entries(actorHPs).forEach(entry => {
      const [hpType, hpData] = entry;
      
      // Sum up max HPs values.
      hpData.max += (actorHPs[hpType].base ?? 0);
      hpData.max += (effectsHPs[hpType].max ?? 0);
      hpData.max += (archetypeHPs[hpType].max ?? 0); 
      hpData.max += (actorHPs[hpType].bonus ?? 0);
      
      // Sum up regen values.
      MixedDiceAndNumber.applyBonusToMixed({
        mixed: combinedRegen[hpType],
        additionalBonus: actorHPs[hpType].regen
      });
      MixedDiceAndNumber.addMixedToMixed({
        mixed: combinedRegen[hpType],
        additionalMixed: archetypeHPs[hpType].regen
      });
      MixedDiceAndNumber.applyBonusToMixed({
        mixed: combinedRegen[hpType],
        additionalBonus: effectsHPs[hpType].regen
      });

      // Set the combined regen text of the actor's regen.
      hpData.combinedRegen = [combinedRegen[hpType].num, ...combinedRegen[hpType].texts].join(' + ');
    });    

    // Gather HPs that are actually used for the context's needs.
    const usedHps = {};
    Object.entries(actorHPs).forEach(entry => {
      const [hpType, hpData] = entry;
      if (hpType === "armor") {
        if (context.flags.useArmor) { usedHps[hpType] = hpData; }
      } else if (hpType === "bone") {
        if (context.flags.useBone) { usedHps[hpType] = hpData; }
      } else if (hpType === "eridian") {
        if (context.flags.useEridian) { usedHps[hpType] = hpData; }
      } else {
        usedHps[hpType] = hpData;
      }
    });

    context.hps = usedHps;

    // Square brackets needed to get the right value.
    const hpsHasChanges = JSON.stringify(actorHPs) !== JSON.stringify(oldActorHPs);
    if (hpsHasChanges) {
      const attributeLabel = `system.attributes.hps`;
      this.actor.update({[attributeLabel]: actorHPs});
    }
  }

  _prepareNpcHps(context) {
    context.hps = context.system.attributes.hps;
  }

  async _prepareEnrichedFields(context, actorType) {
    let additionalEnrichments = {};
    if (actorType == 'vault hunter') {
      additionalEnrichments = {
        ...additionalEnrichments,
        ...(await this._getVaultHunterEnrichedFields(context)),
      };
    }
    if (actorType == 'npc') {
      additionalEnrichments = {
        ...additionalEnrichments,
        ...(await this._getNPCEnrichedFields(context)),
      };
    }

    const system = this.object.system;
    const configs = {async: true};
    context.enriched = {
      bio: {
        appearance: await TextEditor.enrichHTML(system.bio.appearance, configs),
        background: await TextEditor.enrichHTML(system.bio.background, configs),
        characterInfo: await TextEditor.enrichHTML(system.bio.characterInfo, configs),
        loyalties: await TextEditor.enrichHTML(system.bio.loyalties, configs),
        traits: await TextEditor.enrichHTML(system.bio.traits, configs),
        additionalNotes: await TextEditor.enrichHTML(system.bio.additionalNotes, configs),
      },
      ...additionalEnrichments
    };
  }

  async _getVaultHunterEnrichedFields(context) {
    const system = this.object.system;
    const configs = {async: true};
    return {
      class: {
        background: {
          description: await TextEditor.enrichHTML(system.class.background.description, configs),
        },
      },
    };
  }

  async _getNPCEnrichedFields(context) {
    const system = this.object.system;
    const configs = {async: true};
    return {
      special: await TextEditor.enrichHTML(system.special, configs),
    };
  }

  /**
   * Organize and classify Items for Vault Hunter sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareVaultHunterData(context) {
    // Handle stat scores.
    for (let [k, v] of Object.entries(context.system.stats)) {
      v.label = game.i18n.localize(CONFIG.BNB.stats[k]) ?? k;
    }

    // Handle hp scores.
    for (let [k, v] of Object.entries(context.system.attributes.hps)) {
      v.label = game.i18n.localize(CONFIG.BNB.hps[k]) ?? k;
    }
  }

  /**
   * Organize and classify Items for Vault Hunter and NPC sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  async _prepareItems(context) {
    // Initialize containers.
    const features = [];
    const skilltree = {
      1: [], 2: [], 3: [],
      4: [], 5: [], 6: [],
    };
    const guns = [];
    const equippedGuns = [];
    const shields = [];
    const grenades = [];
    const equippedGrenades = [];
    const relics = [];
    const potions = [];
    const archetypeLevels = [];
    const archetypeFeats = [];
    const actionSkills = [];
    const keyItems = [];

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || DEFAULT_TOKEN;
      
      if (i.type === 'key item') { keyItems.push(i); }
      else if (i.type === 'feature') { features.push(i); }
      else if (i.type === 'skill') {
        if (i.system.tier != null) {
          skilltree[i.system.tier].push(i);
          context.skillPoints.value += i.system.skillLevel;
        }
      }
      else if (i.type === 'Archetype Level') { archetypeLevels.push(i); }
      else if (i.type === 'Archetype Feat') { archetypeFeats.push(i); }
      else if (i.type === 'Action Skill') { actionSkills.push(await Enricher.enrichItem(i)); } // Append to Action Skills (should probably only ever be one, but whatever).
      else if (i.type === 'gun') {

        const damageElementsHtml = genericUtil.createGunDamagePerHitHtml({ elements: i.system.elements });
        i.system.dmgPerHitHtml = (damageElementsHtml 
          ? damageElementsHtml + `<label class="element-damage-damage">per hit</label>`
          : '');

        const bonusDamageElementsHtml = genericUtil.createGunBonusDamageHtml({ elements: i.system.bonusElements });
        i.system.bonusDamageHtml = (bonusDamageElementsHtml 
          ? bonusDamageElementsHtml + `<label class="element-damage-damage">bonus</label>`
          : '');
        guns.push(i);
        if (i.system.equipped) { equippedGuns.push(i); }
      } else if (i.type === 'shield') {
        i.system.resistHtml = genericUtil.createMiniShieldResistHtml({ elements: i.system.elements });
        shields.push(i);
      } else if (i.type === 'grenade') {
        const grenadeDamageHtml = genericUtil.createGrenadeDamageHtml({ elements: i.system.elements });
        i.system.dmgHtml = (grenadeDamageHtml
          ? grenadeDamageHtml + `<label class="element-damage-damage">Damage</label>`
          : '');
        grenades.push(i);
        if (i.system.equipped) { equippedGrenades.push(i); }
      }
      else if (i.type === 'relic') { relics.push(i); }
      else if (i.type === 'potion') {
        potions.push(i);
        context.potionCount.value += i.system.quantity;
      }
    }

    // If we don't already have an action skill, make one for the player.
    if (actionSkills.length === 0) {
      const actorActionSkill = this?.actor?.system?.class?.actionSkill;
      
      // Prepare item data.
      const nameToUse = ((!actorActionSkill?.name || actorActionSkill?.name === 'Action Skill')
        ? 'Action Skill'
        : actorActionSkill?.name);
      const itemSystemData = {
        class: '', 
        bonusUses: 0,
        description: actorActionSkill?.description,
        notes: actorActionSkill?.notes,
      };
      const newActionSkillItemData = {
        name: nameToUse,
        type: "Action Skill",
        img: 'icons/svg/clockwork.svg',
        system: {...itemSystemData}
      };

      // Create item for use.
      const newASitem = await Item.create(newActionSkillItemData, { parent: this.actor });
      context.items.push(newASitem);
    }

    // My code is a disaster and so am I.
    const archetype1Levels = [];
    const archetype2Levels = [];
    const unbouncArchetypeLevels = [];
    for (let level of archetypeLevels) {
      if (level.system.archetypeNumber == '1') {
        archetype1Levels.push(level);
      } else if (level.system.archetypeNumber == '2') {
        archetype2Levels.push(level);
      } else {
        unbouncArchetypeLevels.push(level);
      }
    }

    function archCompare(a, b) { // My code is a disaster and so am I.
      return (a.system.level > b.system.level) ? 1 : ((b.system.level > a.system.level) ? -1 : 0)
    }
    // Assign and return
    /// Items that only exist for character stuff.
    context.features = features;
    context.skilltree = skilltree;
    context.archetype1Levels = archetype1Levels.sort(archCompare);
    context.archetype2Levels = archetype2Levels.sort(archCompare);
    context.archetypeFeats = archetypeFeats;
    context.actionSkills = actionSkills;
    /// Items that are actually inventory items.
    context.keyItems = keyItems;
    context.guns = guns;
    context.equippedGuns = equippedGuns;
    context.shields = shields;
    context.grenades = grenades;
    context.equippedGrenades = equippedGrenades;
    context.relics = relics;
    context.potions = potions;
  }

  prepareMissingActionSkill() {

  }

  defaultArchetypeLevelBonusTotals() {
    return DefaultData.archetypeLevelBonusTotals();
  }

  /* -------------------------------------------- */
  inRender(toggle) {
    this.render(toggle);
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;
    // -------------------------------------------------------------
    
    // Handle Items.
    html.find('.checkbox').click((event) => OnActionUtil.onItemCheckbox(event, this.actor));

    html.find('.item-create').click((event) => OnActionUtil.onItemCreate(event, this.actor));
    html.find('.item-edit').click((event) => OnActionUtil.onItemEdit(event, this.actor));
    html.find('.item-delete').click((event) => ConfirmActionPrompt.deleteItem(event, {
      actor: this.actor,
      inRender: this.inRender.bind(this, false),
    }));
    
    // Handle Old Archetype Rewards.
    html.find('.old-archetype-reward-upgrade').click((event) => OnActionUtil.onOldArchetypeRewardUpgrade(event, this.actor));
    html.find('.old-archetype-reward-delete').click((event) => OnActionUtil.onOldArchetypeRewardDelete(event, this.actor));
    
    // Handle Collapsible Sections.
    html.find('.archetype-reward-collapse-toggle').click((event) => OnActionUtil.onArchetypeRewardCollapseToggle(event, this.actor));
    html.find('.skill-tier-collapse-toggle').click((event) => OnActionUtil.onSkillTierCollapseToggle(event, this.actor));
    html.find('.category-collapse-toggle').click((event) => OnActionUtil.onCategoryCollapseToggle(event, this.actor));

    // Handle action skill.
    html.find('.action-skill-use').click((event) => ConfirmActionPrompt.useActionSkill(event, {actor: this.actor}));

    // Handle combat health adjustments.
    html.find('.take-damage').click((event) => ConfirmActionPrompt.takeDamage(event, { actor: this.actor }));

    // Handle HP Gains.
    html.find('.hp-gain').click(this._onHpGain.bind(this));

    // Handle XP Gains.
    html.find('.xp-gain').click(this._onXpGain.bind(this));
    html.find('.set-level').click(this._onSetLevel.bind(this));

    // Handle checkbox changes.
    html.find(".checkbox").click((event) => OnActionUtil.onCheckboxClick(event, this.actor));

    // Display inventory details.
    html.find(`.${Dropdown.getComponentClass('clickable')}`).mouseup(this._onItemDetailsComponenetClick.bind(this));

    // Active Effect management
    html.find('.effect-control').click((event) => onManageActiveEffect(event, this.actor));

    // Rollable abilities.
    html.find('.rollable').click(this._onRoll.bind(this));
    html.find('.postable').click(this._onPost.bind(this));

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }

  async _onHpGain(event) {
    return await this._attributeGainDialog(event, ['value', 'base']);
  }

  async _onXpGain(event) {
    return await this._attributeGainDialog(event, ['value']);
  }

  async _attributeGainDialog(event, statsArray) {
    // Prep data.
    const actorSystem = this.actor.system;
    const dataset = event.currentTarget.dataset;

    const templateLocation = 'systems/bunkers-and-badasses/templates/dialog/gain-attribute.html';
    const dialogHtmlContent = await renderTemplate(templateLocation, {
      attributeName: dataset.attributeName,
    });

    this.gainDialog = new Dialog({
      title: `Gain ${dataset.attributeName}`,
      Id: `gain-attribute-${dataset.attributeName}-dialog`,
      content: dialogHtmlContent,
      buttons: {
        "Cancel" : {
          label : "Cancel",
          callback : async (html) => {}
        },
        "Roll" : {
          label : `Gain ${dataset.attributeName}`,
          callback : async (html) => {
            return await this._gainAttribute(dataset, html, statsArray);
          }
        }
      }
    }).render(true);
  }

  async _gainAttribute(dataset, html, statsArray) {
    // Prep data to access.
    const actorSystem = this.actor.system;

    // Pull data from html.
    const gainAmount = parseInt(html.find("#attribute-gain-input")[0].value);
    if (isNaN(gainAmount)) { return; }

    // Update the actor.
    const attribute = genericUtil.deepFind(actorSystem, dataset.dataPath);
    if (!attribute.gains) { attribute.gains = []; }
    attribute.gains.push({ value: gainAmount, reason: "Add Clicked" });

    // Loop the array of stats to update, and update them all.
    for (const stat of statsArray) {
      if (stat != null) {
        // Initialize stat if not already.
        if (!attribute[stat]) { attribute[stat] = 0; }
        attribute[stat] += gainAmount;
      }
    }

    // Square brackets needed to get the right value.
    const attributeLabel = `system.${dataset.dataPath}`;
    return await this.actor.update({[attributeLabel]: attribute});
  }

  async _onSetLevel(event) {
    // Prep data to access.
    const dataset = event.currentTarget.dataset;

    const templateLocation = 'systems/bunkers-and-badasses/templates/dialog/set-level.html';
    const dialogHtmlContent = await renderTemplate(templateLocation, { });

    this.gain = new Dialog({
      title: `Set Level`,
      Id: `set-level-dialog`,
      content: dialogHtmlContent,
      buttons: {
        "Cancel" : {
          label : "Cancel",
          callback : async (html) => {}
        },
        "Roll" : {
          label : `Set Level`,
          callback : async (html) => {
            return await this._setLevel(dataset, html);
          }
        }
      }
    }).render(true);
  }

  async _setLevel(dataset, html) {
    // Prep data to access.
    const actorSystem = this.actor.system;

    // First, start with the book provided cutoffs.
    const experiencePerSegmentCutoffs = this._getExperiencePerSegmentCutoffsList();
    
    // Next, use the cutoffs to determine individual exp required to reach each next level.
    const experienceReqs = this._generateExperienceRequirements();

    // Pull data from html.
    const newLevel = parseInt(html.find("#set-level-input")[0].value);
    if (isNaN(newLevel)) { return; }

    const newXp = { };
    
    // TODO rewrite most of the XP stuff to be less... messy.
    newXp.value = experienceReqs[newLevel].toHitThisLevel;
    newXp.total = experienceReqs[newLevel].toHitThisLevel;

    this.actor.update({"system.attributes.xp.value": newXp.value});
    this.actor.update({"system.attributes.xp.total": newXp.total});
  }

  _onItemDetailsComponenetClick(event) {
    const classList = event.target.classList;
    if (classList.contains('stop-dropdown')) { return; }
    const parentClassList = event.target.parentElement.classList;
    if (parentClassList.contains('stop-dropdown')) { return; }

    // Get needed values.
    const id = $(event.currentTarget).attr("data-item-id");
    const item = this.actor.items.get(id);

    // Handle interactions per button click.
    const dropdownData = { item: item };
    if (item.type ==='gun') {
      dropdownData.damagePerHitHtml = genericUtil.createGunDamagePerHitHtml({ elements: item.system.elements });
      dropdownData.damagePerAttackHtml = genericUtil.createGunBonusDamageHtml({ elements: item.system.bonusElements });
    } else if (item.type === 'shield') {
      dropdownData.resistHtml = genericUtil.createFullShieldResistHtml({ elements: item.system.elements });
    } else if (item.type === 'grenade') {
      dropdownData.damageHtml = genericUtil.createGrenadeDamageHtml({ elements: item.system.elements });
    }
    if (item && event.button == 0)
      Dropdown.toggleItemDetailsDropdown(event, dropdownData);
    else if (item)
      item.sheet.render(true);
  }

  /**
   * Handle clickables that send info to chat.
   * @param {Event} event   The originating click event
   * @private
   */
  async _onPost(event) {
    event.preventDefault();
    const dataset = event.currentTarget.dataset;

    if (!dataset.rollType) { return; }

    if (dataset.rollType == 'item') {
      const itemId = event.currentTarget.closest('.post-item').dataset.itemId;
      const item = this.actor.items.get(itemId);
      await PostToChat.itemInfo({item: item, actor: this.actor});
    }
  }

  /**
   * Handle clickables that send rolls to chat.
   * @param {Event} event   The originating click event
   * @private
   */
  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return await item.roll();
      } else if (dataset.rollType == 'melee-dice-roll') {
        return PerformRollAction.meleeAndHPDice({ actor: this.actor });
      } else if (dataset.rollType == 'check') {
        return ConfirmActionPrompt.checkRoll(event, { actor: this.actor, dataset: dataset });
      } else if (dataset.rollType == 'badass-move') {
        return ConfirmActionPrompt.badassRoll(event, { actor: this.actor, dataset: dataset });
      } else if (dataset.rollType == 'health-regain') {
        return this._healthRegainRoll(dataset);
      } else if (dataset.rollType == 'melee-attack') {
        return ConfirmActionPrompt.meleeAttack(event, { actor: this.actor, dataset: dataset });
      } else if (dataset.rollType == 'gun-attack') {
        return ConfirmActionPrompt.rangedAttack(event, { actor: this.actor, dataset: dataset});
      } else if (dataset.rollType == 'grenade-throw') {
        return ConfirmActionPrompt.checkRoll(event, { actor: this.actor, dataset: dataset, defaultDifficulty: 12 });
      } else if (dataset.rollType == 'item-throw') {
        return ConfirmActionPrompt.checkRoll(event, { actor: this.actor, dataset: dataset, defaultDifficulty: 12 });
      } else if (dataset.rollType == 'npc-attack') {
        return ConfirmActionPrompt.npcAttack(event, { actor: this.actor, dataset: dataset });
      } else if (dataset.rollType == 'npc-action') {
        return PostToChat.npcAction({ actor: this.actor, dataset: dataset });
      }
    }
    
    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      const label = dataset.label ? `[ability] ${dataset.label}` : '';
      const baseFormula = dataset.roll;
      const rollResult = await new Roll(baseFormula, this.actor.getRollData()).roll();
      rollResult.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return rollResult;
    }
  }
  
  async _healthRegainRoll(dataset) {
    // Prep data to access.
    const actorSystem = this.actor.system;
    const hp = actorSystem.attributes.hps[dataset.healthType.toLowerCase()];
    const hpRegainAction = {
      shield: "recharges",
      armor: "repairs",
      flesh: "regens",
      bone: "regrows",
      eridian: "reinvigorates"
    }
    
    // Prepare and roll the check.
    const roll = new Roll(
      `${hp.combinedRegen}`,
      RollBuilder._createDiceRollData({actor: this.actor})
    );
    const rollResult = await roll.roll();

    // Prep chat values.
    const flavorText = `${this.actor.name} ${hpRegainAction[dataset.healthType.toLowerCase()]} ${rollResult.total} <b>${hp.label}</b>.`;
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: flavorText,
      //type: CONST.CHAT_MESSAGE_STYLES.ROLL,
      roll: rollResult,
      rollMode: CONFIG.Dice.rollModes.publicroll,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u.id)
      speaker: ChatMessage.getSpeaker(),
    }

    // Update the appopriate values.
    let newValue = hp.value + rollResult.total;
    if (newValue > hp.max) newValue = hp.max;
    const target = "system.attributes.hps." + dataset.healthType.toLowerCase() + ".value";
    this.actor.update({[`${target}`] : newValue});

    // Send the roll to chat!
    return rollResult.toMessage(messageData);
  }
}