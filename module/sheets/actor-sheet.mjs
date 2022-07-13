import {onManageActiveEffect, prepareActiveEffectCategories} from "../helpers/effects.mjs";
import { RollBuilder } from "../helpers/roll-builder.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class BNBActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
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
  getData() {
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

    // Prepare Vault Hunter data and items.
    if (actorData.type == 'vault hunter') {
      this._updateVaultHunterFromPreviousVersions(context);
      this._prepareItems(context);
      this._prepareArchetypes(context);
      this._prepareExperience(context);
      this._prepareVhHps(context);
      this._prepareVaultHunterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == 'npc') {
      this._updateNPCFromPreviousVersions(context);
      this._prepareItems(context);
      this._prepareNpcHps(context);
    }

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);
    
    return context;
  }

  _updateVaultHunterFromPreviousVersions(context) {

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

  _prepareVhHps(context) {
    const actorHPs = this.actor.system.attributes.hps;
    const oldActorHPs = JSON.parse(JSON.stringify(actorHPs));
    const effectsHPs = this.actor.system.bonus.healths;
    
    // Clean slate for HPs totals.
    actorHPs.flesh.max = actorHPs.armor.max = actorHPs.shield.max = actorHPs.bone.max = actorHPs.eridian.max = 0;
    actorHPs.flesh.combinedRegen = actorHPs.armor.combinedRegen = actorHPs.shield.combinedRegen 
      = actorHPs.bone.combinedRegen = actorHPs.eridian.combinedRegen = "";
    
    // Get the HPs from the actor data
    Object.entries(context.items).forEach(entry => {
      const [itemIndex, itemData] = entry;
      if (itemData.type === "shield" && itemData.system.equipped) {
        actorHPs[itemData.system.healthType].max += itemData.system.capacity ?? 0;
        if (actorHPs[itemData.system.healthType].combinedRegen) {
          actorHPs[itemData.system.healthType].combinedRegen += ' + ';
        }
        actorHPs[itemData.system.healthType].combinedRegen += itemData.system.recoveryRate;
      }
    });

    // Add bonuses from Builder Tab and effects.
    Object.entries(actorHPs).forEach(entry => {
      const [hpType, hpData] = entry;
      hpData.max += (actorHPs[hpType].base ?? 0) + (effectsHPs[hpType].max ?? 0);
      if (actorHPs[hpType].regen) {
        if (hpData.combinedRegen) { hpData.combinedRegen += ' + '; }
        hpData.combinedRegen += actorHPs[hpType].regen;
      }
      if (effectsHPs[hpType].regen) {
        if (hpData.combinedRegen) { hpData.combinedRegen += ' + '; }
        hpData.combinedRegen += effectsHPs[hpType].regen;
      }
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
  _prepareItems(context) {
    // Initialize containers.
    const features = [];
    const skills = {
      1: [], 2: [], 3: [],
      4: [], 5: [], 6: []
    }
    const guns = [];
    const equippedGuns = [];
    const shields = [];
    const grenades = [];
    const equippedGrenades = [];
    const relics = [];
    const potions = [];
    const archetypeFeats = [];
    const keyItems = [];

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || DEFAULT_TOKEN;
      
      if (i.type === 'key item') {
        keyItems.push(i); // Append to key item.
      } else if (i.type === 'feature') {
        features.push(i); // Append to features.
      } else if (i.type === 'skill') {
        if (i.system.tier != null) {
          skills[i.system.tier].push(i); // Append to skill.
        }
      } else if (i.type === 'Archetype Feat') {
        archetypeFeats.push(i); // Append to archetype Feats.
      } else if (i.type === 'gun') {
        let elemIcon = "";
        let gunDmgString = "";
        const finalPlus = `<label class="element-damage-plus"> + </label>`;
        Object.entries(i.system.elements).forEach(e => {
          const element = e[1];
          if(element.enabled) {
            elemIcon = (e[0] === "kinetic") ? ""
            : `<img id="gunDmg${element.label}" alt="${element.label}" 
              class="element-damage-icon" src="systems/bunkers-and-badasses/assets/elements/${element.label}.png" />`;

              gunDmgString += 
            `<label class="element-label" style="--elementColor:${element.color}">
              ${element.damage} ${elemIcon}
            </label> ${finalPlus}`;
          }
        });
        
        // We need to remove the last plus label, it doesn't belong.
        gunDmgString = gunDmgString.slice(0, finalPlus.length * -1);

        // Add the "damage" text.
        gunDmgString += `<label class="element-damage-damage">Damage</label>`;
        
        i.system.dmgHtml = gunDmgString;
        guns.push(i);
        if (i.system.equipped) {
          equippedGuns.push(i);
        }
      } else if (i.type === 'shield') {
        let shieldResistString = "";
        Object.entries(i.system.elements).forEach(e => {
          const element = e[1];
          if(element.enabled) {
            shieldResistString += `<img id="resist${element.label}" alt="${element.label}" 
              class="element-resist-icon" src="systems/bunkers-and-badasses/assets/elements/${element.label}.png" />`;
          }
        });
        i.system.resistHtml = shieldResistString;
        shields.push(i);
      } else if (i.type === 'grenade') {
        let grenadeDmgString = "";
        let elemIcon = "";
        const finalPlus = `<label class="element-damage-plus"> + </label>`;
        Object.entries(i.system.elements).forEach(e => {
          const element = e[1];
          if(element.enabled) {
            elemIcon = (e[0] === "kinetic") ? ""
            : `<img id="gDmg${element.label}" alt="${element.label}" 
              class="element-damage-icon" src="systems/bunkers-and-badasses/assets/elements/${element.label}.png" />`;

            grenadeDmgString += 
            `<label class="element-label" style="--elementColor:${element.color}">
              ${element.damage} ${elemIcon}
            </label> ${finalPlus}`;
          }
        });

        // We need to remove the last plus label, it doesn't belong.
        grenadeDmgString = grenadeDmgString.slice(0, finalPlus.length * -1); 

        // Add the "damage" text.
        grenadeDmgString += `<label class="element-damage-damage">Damage</label>`;

        i.system.dmgHtml = grenadeDmgString;
        grenades.push(i);
        if (i.system.equipped) {
          equippedGrenades.push(i);
        }
      } else if (i.type === 'relic') {
        relics.push(i);
      } else if (i.type === 'potion') {
        potions.push(i);
      }
    }

    // Assign and return
    context.keyItems = keyItems;
    context.features = features;
    context.skills = skills;
    context.archetypeFeats = archetypeFeats;
    context.guns = guns;
    context.equippedGuns = equippedGuns;
    context.shields = shields;
    context.grenades = grenades;
    context.equippedGrenades = equippedGrenades;
    context.relics = relics;
    context.potions = potions;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;
    // -------------------------------------------------------------
    
    // Handle Items.
    html.find('.item-create').click(this._onItemCreate.bind(this));
    html.find('.checkbox').click(this._onItemCheckbox.bind(this));
    // html.find('.item-equip').click(ev => {
    //   ev.stopPropagation();
    //   const li = $(ev.currentTarget).parents(".item-element-group");
    //   const item = this.actor.items.get(li.data("itemId"));
    //   item.data.system.equipped = !item.data.system.equipped;
    //   let hello="hello"
    // });
    html.find('.item-edit').click(ev => {
      ev.stopPropagation();
      const li = $(ev.currentTarget).parents(".item-element-group");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });
    html.find('.item-delete').click(ev => {
      ev.stopPropagation();
      const li = $(ev.currentTarget).parents(".item-element-group");
      const item = this.actor.items.get(li.data("itemId"));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    // Handle Archetype Rewards.
    html.find('.archetype-reward-create').click(this._onArchetypeRewardCreate.bind(this));
    html.find('.archetype-reward-edit').click(this._onArchetypeRewardEdit.bind(this));
    html.find('.archetype-reward-delete').click(this._onArchetypeRewardDelete.bind(this));
    
    // Handle action skill.
    html.find('.action-skill-edit').click(this._onActionSkillEdit.bind(this));
    html.find('.action-skill-use').click(this._onActionSkillUse.bind(this));

    // Handle combat health adjustments.
    html.find('.take-damage').click(this._onTakeDamage.bind(this));

    // Handle HP Gains.
    html.find('.hp-gain').click(this._onHpGain.bind(this));

    // Handle XP Gains.
    html.find('.xp-gain').click(this._onXpGain.bind(this));
    html.find('.set-level').click(this._onSetLevel.bind(this));

    // Handle checkbox changes.
    html.find(".checkbox").click(this._onCheckboxClick.bind(this));

    // Display inventory details.
    html.find(".item-dropdown").mousedown(this._expandItemDropdown.bind(this))

    // Active Effect management
    html.find(".effect-control").click(ev => onManageActiveEffect(ev, this.actor));

    // Rollable abilities.
    html.find('.rollable').click(this._onRoll.bind(this));

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

  _onArchetypeRewardCreate(event) {
    const archetypeNum = event.currentTarget.dataset.archetypeNumber;
    const archetypeRewards = this.actor.data.system.archetypes["archetype" + archetypeNum].rewards;

    // Figure out the current archetype highest level.
    let highestLevel = 0;
    archetypeRewards.forEach(archetypeReward => {
      if (archetypeReward.Level > highestLevel) {
        highestLevel = archetypeReward.Level;
      }
    });

    archetypeRewards.push({ Level: highestLevel+1, Description: "" });

    // Square brackets needed to get the right value.
    const archetypeRewardsLabel = "system.archetypes.archetype"+archetypeNum+".rewards";
    this.actor.update({[archetypeRewardsLabel]: archetypeRewards});
  }

  async _onArchetypeRewardEdit(event) {
    event.preventDefault();

    const archetypeNum = event.currentTarget.dataset.archetypeNumber;
    const rewardIndex = event.currentTarget.dataset.rewardIndex;
    const archetype = this.actor.data.system.archetypes["archetype" + archetypeNum];

    const templateLocation = 'systems/bunkers-and-badasses/templates/dialog/archetype-reward.html';
    const htmlContent = await renderTemplate(templateLocation, {
      level: archetype.rewards[rewardIndex]["Level"],
      description: archetype.rewards[rewardIndex]["Description"],
      index: rewardIndex, archetypeNum: archetypeNum
    });

    this.rewardDiag = new Dialog({
      title: archetype.name + " Reward",
      Id: "archetype-reward-dialog",
      content: htmlContent,
      buttons: {
        "Update" : {
          label : "Update",
          callback : async (html) => {
            this._updateArchetypeRewardCallback(html);
          }
        }
      }
    }).render(true);
  }
  
  async _updateArchetypeRewardCallback(html) {
    // Pull data from html.
    const levelValue = parseInt(html.find("#archetypeLevel")[0].value);
    const descriptionValue = html.find("#rewardText")[0].value;

    const archetypeNum = parseInt(html.find("#archetypeNum")[0].value);
    const archetype = this.actor.data.system.archetypes["archetype" + archetypeNum];

    const rewardIndex = parseInt(html.find("#rewardIndex")[0].value);

    // Prep data with updated values.
    archetype.rewards[rewardIndex]["Level"] = levelValue;
    archetype.rewards[rewardIndex]["Description"] = descriptionValue;

    archetype.rewards.sort((a, b) => a.Level - b.Level);

    // Square brackets needed to get the right value.
    this.actor.update({["system.archetypes.archetype"+archetypeNum+".rewards"]: archetype.rewards});
  }

  _onArchetypeRewardDelete(event) {
    // Pull data from event.
    const archetypeNum = event.currentTarget.dataset.archetypeNumber;
    const rewardIndex = event.currentTarget.dataset.rewardIndex;
    const archetype = this.actor.data.system.archetypes["archetype" + archetypeNum];
    
    // Prep data for saving.
    archetype.rewards.splice(rewardIndex, 1);
    
    // Square brackets needed to get the right value.
    this.actor.update({["system.archetypes.archetype"+archetypeNum+".rewards"]: archetype.rewards});
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.dtype;
    // Grab any data associated with this control.
    const system = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: system
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system["type"];

    // Finally, create the item!
    return await Item.create(itemData, {parent: this.actor});
  }

  _onItemCheckbox(event) {
    let target = $(event.currentTarget).attr("data-target")
    if (target == "item") {
      target = $(event.currentTarget).attr("data-item-target")
      let item = this.actor.items.get($(event.currentTarget).parents(".item").attr("data-item-id"))
      return item.update({ [`${target}`]: !getProperty(item.system, target) })
    }
    if (target)
      return this.actor.update({[`${target}`] : !getProperty(this.actor.system, target)});
  }

  async _onActionSkillEdit(event) {
    // Prep data to access.
    const actorSystem = this.actor.data.system;
    const dataset = event.currentTarget.dataset;
    const actionSkill = actorSystem.class.actionSkill;

    const templateLocation = 'systems/bunkers-and-badasses/templates/dialog/action-skill-edit.html';
    const dialogHtmlContent = await renderTemplate(templateLocation, {
      actionSkill: actionSkill
    });

    this.actionSkill = new Dialog({
      title: `Update Action Skill`,
      Id: `update-action-skill-dialog`,
      content: dialogHtmlContent,
      buttons: {
        "Cancel" : {
          label : "Cancel",
          callback : async (html) => {}
        },
        "Roll" : {
          label : `Update Action Skill`,
          callback : async (html) => {
            return await this._updateActionSkill(dataset, html);
          }
        }
      }
    }).render(true);
  }

  async _updateActionSkill(dataset, html) {
    // Pull data from html.
    const actionSkill = {
      name: html.find("#as-name")[0].value,
      description: html.find("#as-description")[0].value,
      notes: html.find("#as-notes")[0].value,
      uses: {
        value: html.find("#as-uses-value")[0].value,
        max: html.find("#as-uses-max")[0].value,
        min: 0
      }
    };
    return await this.actor.update({"system.class.actionSkill": actionSkill});
  }

  async _onActionSkillUse() {
    // Prep data
    const actorSystem = this.actor.data.system;

    // Prep chat values.
    const flavorText = `${this.actor.name} uses ${actorSystem.class.actionSkill.name}.`;
    const messageContent = actorSystem.class.actionSkill.description;
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: flavorText,
      type: CONST.CHAT_MESSAGE_TYPES.IC,
      content: messageContent,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u.id)
      speaker: ChatMessage.getSpeaker(),
    }

    // Send the roll to chat!
    return ChatMessage.create(messageData);
  }

  async _onTakeDamage() {
    
    const templateLocation = "systems/bunkers-and-badasses/templates/dialog/take-damage.html";
    const takeDamageDialogContent = await renderTemplate(templateLocation, { });

    this.takeDamageDialog = new Dialog({
      title: `Take Damage`,
      Id: `take-damage-dialog`,
      content: takeDamageDialogContent,
      buttons: {
        "Cancel" : {
          label : "Cancel",
          callback : async (html) => {}
        },
        "Take Damage" : {
          label : `Take Damage`,
          callback : async (html) => {
            return await this._takeDamage(html);
          }
        }
      }
    }).render(true);
  }

  async _takeDamage(html) {
    // Prep data to access.
    const actorSystem = this.actor.data.system;
    const hps = actorSystem.attributes.hps;

    // Pull data from html.
    const damageAmount = html.find("#damage-value")[0].value;
    const damageType = $("input[type=radio][name=damage-type-element]:checked")[0].dataset.element.toLowerCase();

    if (isNaN(damageAmount) || damageAmount <= 0) { return; }

    // Track the amount of damage done to each health type.
    const damageTaken = { };
    const modifyDamage = {
      eridian: {
        x2: [],
        ignore: []
      },
      shield: {
        x2: ['shock', 'corroshock'],        
        ignore: ['radiation', 'incendiation']
      },
      armor: {
        x2: ['corrosive', 'corroshock'],
        ignore: []
      },
      flesh: {
        x2: ['incendiary', 'incendiation'],
        ignore: []
      },
      bone: {
        x2: ['cryo', 'crysplosive'],
        ignore: []
      },
    }

    // Calculate how much damage is taken to each health type.
    let damageToDeal = damageAmount;
    Object.entries(hps).forEach(([healthType, hpValues]) => {
      // Skip over healthbars that don't get hit by this damage type.
      if (!modifyDamage[healthType].ignore.includes(damageType)) {

        // Initialize a damage taken for a healthbar to 0 if it hasn't been initialized yet.
        if (damageTaken[healthType] == null) { damageTaken[healthType] = 0; }

        // Looping is not the most efficient way to do this, but it's the easiest for my frail mind (for now).
        while (damageToDeal > 0 && hps[healthType].value > damageTaken[healthType]) {
          damageTaken[healthType]++;
          if (modifyDamage[healthType].x2.includes(damageType)) {
            damageTaken[healthType]++; // Double damage for x2 damage types.
          }
          damageToDeal--;
        }

        // After while loop, findalize values as needed.
        if (damageTaken[healthType] > hps[healthType].value) {
          // Don't overshoot! Going forward this will help with displaying the damage to chat.
          damageTaken[healthType] = hps[healthType].value;
        }
        
        // Make the Health take the damage.
        hps[healthType].value -= damageTaken[healthType];
      }
    });

    // TODO Display the damage to chat.

    // Square brackets needed to get the right value.
    const attributeLabel = `system.attributes.hps`;
    return await this.actor.update({[attributeLabel]: hps});
  }

  async _onHpGain(event) {
    return await this._attributeGainDialog(event, ['value', 'base']);
  }
  async _onXpGain(event) {
    return await this._attributeGainDialog(event, ['value']);
  }
  async _attributeGainDialog(event, statsArray) {
    // Prep data.
    const actorSystem = this.actor.data.system;
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
    const actorSystem = this.actor.data.system;

    // Pull data from html.
    const gainAmount = parseInt(html.find("#attribute-gain-input")[0].value);
    if (isNaN(gainAmount)) { return; }

    // Update the actor.
    const attribute = this._deepFind(actorSystem, dataset.dataPath);
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
    const actorSystem = this.actor.data.system;

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

  _deepFind(obj, path) {
    let paths = path.split('.')
      , current = obj
      , i;
  
    for (i = 0; i < paths.length; ++i) {
      if (current[paths[i]] == undefined) {
        return undefined;
      } else {
        current = current[paths[i]];
      }
    }
    return current;
  }

  _onCheckboxClick(event) {
    let target = $(event.currentTarget).attr("data-target")
    if (target == "item") {
        target = $(event.currentTarget).attr("data-item-target")
        let item = this.actor.items.get($(event.currentTarget).parents(".item").attr("data-item-id"))
        return item.update({ [`${target}`]: !getProperty(item, target) })
    }
    if (target)
        return this.actor.update({[`${target}`] : !getProperty(this.actor.system, target)});
  }

  _expandItemDropdown(event) {
    let id = $(event.currentTarget).attr("data-item-id")
    let item = this.actor.items.get(id)
    if (item && event.button == 0)
      this._createDropdown(event, { text: item.system.description });
    else if (item)
      item.sheet.render(true)
  }

  _createDropdown(event, dropdownData) {
    let dropdownHTML = ""
    event.preventDefault()
    let li = $(event.currentTarget).parents(".item-element-group")
    // Toggle expansion for an item
    if (li.hasClass("expanded")) { // If expansion already shown - remove
      let summary = li.children(".item-summary");
      summary.slideUp(200, () => summary.remove());
    } else {
      // Add a div with the item summary belowe the item
      let div
      if (!dropdownData) {
        return
      } else {
        dropdownHTML = `<div class="item-summary">${TextEditor.enrichHTML(dropdownData.text)}`;
      }
      // if (dropdownData.tags) {
      //     let tags = `<div class='tags'>`
      //     dropdownData.tags.forEach(tag => {
      //         tags = tags.concat(`<span class='tag'>${tag}</span>`)
      //     })
      //     dropdownHTML = dropdownHTML.concat(tags)
      // }
      dropdownHTML += "</div>"
      div = $(dropdownHTML)
      li.append(div.hide());
      div.slideDown(200);
    }
    li.toggleClass("expanded");
}

  /**
   * Handle clickable rolls.
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
        return this._meleeAndHPDiceRoll(dataset);
      } else if (dataset.rollType == 'check') {
        return this._checkRoll(dataset);
      } else if (dataset.rollType == 'badass-move') {
        return this._badassRoll(dataset);
      } else if (dataset.rollType == 'health-regain') {
        return this._healthRegainRoll(dataset);
      } else if (dataset.rollType == 'melee-attack') {
        return this._meleeAttackRoll(dataset);
      } else if (dataset.rollType == 'gun-attack') {
        return this._gunAccuracyRoll(dataset);
      } else if (dataset.rollType == 'grenade-throw') {
        return this._grenadeThrowRoll(dataset);
      } else if (dataset.rollType == 'item-throw') {
        return this._itemThrowRoll(dataset);
      } else if (dataset.rollType == 'npc-attack') {
        return this._npcAttackRoll(dataset);
      } else if (dataset.rollType == 'npc-action') {
        return this._npcActionRoll(dataset);
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
  
  /* -------------------------------------------- */
  /*  Various roll starters                       */
  /* -------------------------------------------- */
  async _npcAttackRoll(dataset) {
    // Prep data to access.
    const actorSystem = this.actor.data.system;

    const templateLocation = 'systems/bunkers-and-badasses/templates/dialog/npc-attack-confirmation.html';
    const dialogHtmlContent = await renderTemplate(templateLocation, { });

    this.attack = new Dialog({
      title: "Attack",
      Id: "npc-attack-prompt",
      content: dialogHtmlContent,
      buttons: {
        "Cancel" : {
          label : "Cancel",
          callback : async (html) => {}
        },
        "Roll" : {
          label : "Roll",
          callback : async (html) => {
            return await this._rollNpcAttackDice(dataset, html);
          }
        }
      }
    }).render(true);
  }

  async _npcActionRoll(dataset) {
    const actorSystem = this.actor.system;
    const actionObject = this._deepFind(actorSystem, dataset.path.replace('system.', '')); // data.data

    // Prep chat values.
    const flavorText = `${this.actor.name} uses <i>${actionObject.name}</i>.`;
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: flavorText,
      content: actionObject.description,
      type: CONST.CHAT_MESSAGE_TYPES.IC,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u.id)
      speaker: ChatMessage.getSpeaker(),
    }

    // Send the roll to chat!
    return ChatMessage.create(messageData);
  }

  async _meleeAndHPDiceRoll(dataset) {
    const actorSystem = this.actor.data.system;

    const rollFormula = `${actorSystem.class.meleeDice}[Melee Dice] + @mstmod[MST mod]`;
    const roll = new Roll(
      rollFormula,
      RollBuilder._createDiceRollData({actor: this.actor})
    );
    const rollResult = await roll.roll();

    const flavorText = `${this.actor.name} rolls their Melee Dice.`;
    return rollResult.toMessage({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: flavorText,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: rollResult,
      rollMode: CONFIG.Dice.rollModes.publicroll,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u.id)
      speaker: ChatMessage.getSpeaker(),
    });
  }

  async _checkRoll(dataset) {
    // Prep data to access.
    const actorSystem = this.actor.data.system;
    const check = actorSystem.checks[dataset.checkType.toLowerCase()];
    if (check.nonRolled) return; // Special case for movement, since I (potentially foolishly) bundled it with checks.
    if (dataset.checkType.toLowerCase() === 'initiative') {
      return this.actor.rollInitiative({createCombatants: true});
    }

    return await this._makeCheck(dataset, {
      checkTitle: `${actorSystem[check.stat].label} Check`,
      checkItem: check,
      promptCheckType: true
    });
  }

  async _badassRoll(dataset) {
    // Prep data to access.
    const actorSystem = this.actor.data.system;

    const roll = new Roll(
      `1d20 + @badassrank[Badass Rank]`,
      RollBuilder._createDiceRollData({actor: this.actor})
    );
    const rollResult = await roll.roll();

    let badassTotal = rollResult.total;
    if (badassTotal == 2 || badassTotal == 3) {
      badassTotal = 1;
    } else if (badassTotal == 19 || badassTotal == 18) {
      badassTotal = 20;
    }
    badassTotal += actorSystem.attributes.badass.rank;

    const templateLocation = 'systems/bunkers-and-badasses/templates/chat/badass-result.html';
    const chatHtmlContent = await renderTemplate(templateLocation, {
      actorId: this.actor.id,
      badassTotal: badassTotal
    });

    // Prep chat values.
    const flavorText = `${this.actor.name} attempts a <i class="fas fa-skull"></i> <b>Badass Move</b>.`;
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: flavorText,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: rollResult,
      rollMode: CONFIG.Dice.rollModes.publicroll,
      content: chatHtmlContent,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u.id)
      speaker: ChatMessage.getSpeaker(),
    }

    // Send the roll to chat!
    return rollResult.toMessage(messageData);
  }
  
  async _healthRegainRoll(dataset) {
    // Prep data to access.
    const actorSystem = this.actor.data.system;
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
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
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

  async _meleeAttackRoll(dataset) {
    // Prep data to access.
    const actorSystem = this.actor.data.system;

    const templateLocation = 'systems/bunkers-and-badasses/templates/dialog/attack-confirmation.html';
    const dialogHtmlContent = await renderTemplate(templateLocation, {
      type: "Melee",
      attack: actorSystem.checks.melee,
      showFavored: false,
      favored: true
    });

    this.attack = new Dialog({
      title: "Melee Attack",
      Id: "melee-attack-prompt",
      content: dialogHtmlContent,
      buttons: {
        "Cancel" : {
          label : "Cancel",
          callback : async (html) => {}
        },
        "Roll" : {
          label : "Roll",
          callback : async (html) => {
            return await this._rollMeleeAttackDice(dataset, html);
          }
        }
      }
    }).render(true);
  }

  async _gunAccuracyRoll(dataset) {
    // Prep data to access.
    const actorSystem = this.actor.data.system;
    const item = this.actor.items.get(dataset.itemId);
    const itemSystem = item.data.system;

    const attackValues = {...actorSystem.checks.shooting};
    attackValues.badassRollsEnabled = actorSystem.attributes.badass.rollsEnabled;
    
    const isFavoredWeaponType = actorSystem.favored[itemSystem.type.value];
    const elementTypes = 
      [ "kinetic", "incendiary", "shock", "corrosive",
        "explosive", "radiation", "cryo",
        "incendiation", "corroshock", "crysplosive"];
    let isFavoredElementType = false;
    elementTypes.forEach(elementType => {
      if (actorSystem.favored[elementType] && itemSystem.elements[elementType]?.enabled) {
        isFavoredElementType = true;
      }
    });
    const templateLocation = "systems/bunkers-and-badasses/templates/dialog/attack-confirmation.html";
    const dialogHtmlContent = await renderTemplate(templateLocation, {
      type: "Gun",
      attack: attackValues,
      showGearMod: true,
      gearAcc: itemSystem.statMods.acc,
      showFavored: true,
      favored: isFavoredWeaponType || isFavoredElementType,
    });

    this.attack = new Dialog({
      title: "Gun Attack",
      Id: "melee-attack-prompt",
      content: dialogHtmlContent,
      buttons: {
        "Cancel" : {
          label : "Cancel",
          callback : async (html) => {}
        },
        "Roll" : {
          label : "Roll",
          callback : async (html) => {
            return await this._rollGunAttackDice(dataset, html, itemSystem.statMods, itemSystem.special.overrideType);
          }
        }
      }
    }).render(true);
  }

  async _grenadeThrowRoll(dataset) {
    // Prep data to access.
    const actorSystem = this.actor.data.system;

    const throwCheck = {
      stat: "acc",
      value: actorSystem.stats.acc.modToUse,
      misc: 0,
      effects: actorSystem.bonus.checks.throw,
      total: 0,
      usesBadassRank: false
    };
    throwCheck.total = throwCheck.value + throwCheck.misc + throwCheck.effects;

    return await this._makeCheck(dataset, {
      checkItem: throwCheck,
      checkTitle: "Grenade Throw Check",
      defaultDifficulty: 12
    }, this._displayGrenadeRollResultToChat);
  }

  async _itemThrowRoll(dataset) {
    // Prep data to access.
    const actorSystem = this.actor.data.system;

    const throwCheck = {
      stat: "acc",
      value: actorSystem.stats.acc.modToUse,
      misc: 0,
      effects: actorSystem.bonus.checks.throw,
      total: 0,
      usesBadassRank: false
    };
    throwCheck.total = throwCheck.value + throwCheck.misc + throwCheck.effects;

    return await this._makeCheck(dataset, {
      checkItem: throwCheck,
      checkTitle: "Item Throw Check",
      defaultDifficulty: 12
    });
  }

  async _makeCheck(dataset, checkObjects, displayResultOverride) {
    // Prep data to access.
    const actorSystem = this.actor.data.system;

    const checkItem = checkObjects.checkItem;
    const checkTitle = checkObjects.checkTitle;
    const defaultDifficulty = checkObjects.defaultDifficulty;
    const promptCheckType = checkObjects.promptCheckType;
    
    const templateLocation = 'systems/bunkers-and-badasses/templates/dialog/check-difficulty.html';
    const dialogHtmlContent = await renderTemplate(templateLocation, {
      attributes: actorSystem.attributes,
      check: checkItem,
      promptCheckType: promptCheckType ?? false,
      isBadass: actorSystem.attributes.badass.rollsEnabled,
      defaultDifficulty: defaultDifficulty,
    });

    this.check = new Dialog({
      title: checkTitle,
      Id: "check-difficulty",
      content: dialogHtmlContent,
      buttons: {
        "Cancel" : {
          label : "Cancel",
          callback : async (html) => {}
        },
        "Roll" : {
          label : "Roll",
          callback : async (html) => {
            return await this._rollCheckDice(dataset, html, checkItem, displayResultOverride);
          }
        }
      }
    }).render(true);
  }

  /* -------------------------------------------- */
  /*  Roll the dice                               */
  /* -------------------------------------------- */
  async _rollNpcAttackDice(dataset, html) {
    // Prep data to access.
    const actorSystem = this.actor.data.system;

    // Pull data from html.
    const bonusValue = parseInt(html.find("#bonus")[0].value);
    const targetSpeedValue = parseInt(html.find("#target-speed")[0].value);

    // Prepare and roll the check.
    const rollBonusMod = isNaN(bonusValue) ? '' : ` + @extraBonus[bonus]`;
    const rollTargetSpd = isNaN(targetSpeedValue) ? '' : ` - @targetSpd[target spd mod]`;
    const rollFormula = `1d20${rollBonusMod}${rollTargetSpd}`;
    const roll = new Roll(rollFormula, {
      bonus: bonusValue,
      targetSpd: targetSpeedValue
    });
    const rollResult = await roll.roll();

    // Display the result.
    return await this._displayNpcAttackRollResultToChat(dataset, { rollResult: rollResult });
  }

  async _rollMeleeAttackDice(dataset, html) {
    // Prep data to access.
    const actorSystem = this.actor.data.system;

    // Pull data from html.
    const extraBonusValue = parseInt(html.find("#extra")[0].value);

    // Prepare and roll the check.
    const rollStatMod = ` + @acc[ACC ${actorSystem.attributes.badass.rollsEnabled ? 'Stat' : 'Mod'}]`;
    const rollMiscBonus = ` + @meleemisc[Misc]`;
    const rollEffectsBonus = ` + @meleeeffects[Effects]`;
    const rollExtraBonus = isNaN(extraBonusValue) ? '' : ` + ${extraBonusValue}[Extra bonus]`;
    const rollFormula = `1d20${rollStatMod}${rollMiscBonus}${rollEffectsBonus}${rollExtraBonus}`;
    const roll = new Roll(
      rollFormula,
      RollBuilder._createDiceRollData(
        { actor: this.actor },
        { extra: extraBonusValue }
      )
    );
    const rollResult = await roll.roll();

    // Display the result.
    return await this._displayMeleeRollResultToChat(dataset, { rollResult: rollResult });
  }

  async _rollGunAttackDice(dataset, html, itemStats, itemOverrideType) {
    // Prep data to access.
    const actorSystem = this.actor.data.system;

    // Pull data from html.
    const extraBonusValue = parseInt(html.find("#extra")[0].value);
    const isFavored = html.find("#favored-checkbox")[0].checked;

    // Prepare and roll the check.
    const rollStatMod = isFavored ? ` + @acc[ACC ${actorSystem.attributes.badass.rollsEnabled ? 'Stat' : 'Mod'}]` : '';
    const rollGearAccBonus = ` + @gearacc[Gear ACC]`;
    
    // SPECIAL special logic for a unique legendary.
    const rollMstMod = (itemOverrideType.toLowerCase() === 'mwbg') ? ` + @mst[MST ${actorSystem.attributes.badass.rollsEnabled ? 'Stat' : 'Mod'}]` : '';
    const rollGearMstBonus = (itemOverrideType.toLowerCase() === 'mwbg') ? ` + @gearmst[Gear MST]` : '';
    // /SPECIAL special logic for a unique legendary.

    const rollMiscBonus = ` + @shootingmisc[Misc]`;
    const rollEffectsBonus = ` + @shootingeffects[Effects]`;
    const rollExtraBonus = isNaN(extraBonusValue) ? '' : ` + ${extraBonusValue}`;
    const rollFormula = `1d20${rollStatMod}${rollGearAccBonus}${rollMstMod}${rollGearMstBonus}${rollMiscBonus}${rollEffectsBonus}${rollExtraBonus}`;
    const roll = new Roll(
      rollFormula,
      RollBuilder._createDiceRollData(
        { actor: this.actor },
        {
          gearacc: itemStats.acc,
          geardmg: itemStats.dmg,
          gearspd: itemStats.spd,
          gearmst: itemStats.mst,
          extrabonusvalue: extraBonusValue 
        }
      )
    );
    const rollResult = await roll.roll();

    // Display the result.
    return await this._displayGunRollResultToChat(dataset, { rollResult: rollResult });
  }

  async _rollCheckDice(dataset, html, checkItem, displayResultOverride) {
    // Prep data to access.
    const actorSystem = this.actor.data.system;
    const checkName = dataset.checkType;
    const checkStat = checkItem.stat;

    // Pull data from html.
    const extraBonusValue = parseInt(html.find("#extra")[0].value);
    const difficultyValue = parseInt(html.find("#difficulty")[0].value);
    const checkTypeElement = html.find("#check-type")
    let checkType;
    if (checkTypeElement && checkTypeElement.length > 0) {
      checkType = checkTypeElement[0].value;
    } 
    const difficultyEntered = !isNaN(difficultyValue);

    // Prepare and roll the check.
    const badassMod = checkItem.usesBadassRank ? ' + @badassrank[Badass Rank]' : ''
    const rollStatMod = ` + @${checkStat.toLowerCase()}[${checkStat.toUpperCase()} ${actorSystem.attributes.badass.rollsEnabled ? 'Stat' : 'Mod'}]`;
    const rollMiscBonus = ` + @${checkName.toLowerCase()}misc[Misc]`;
    const rollEffectBonus = ` + @${checkName.toLowerCase()}effects[Effects]`;
    const rollExtraMod = (isNaN(extraBonusValue) || extraBonusValue == 0 ? '' : ` + @extrabonusvalue[Extra Bonus]`);
    const rollDifficulty = ((difficultyValue != null && !isNaN(difficulty)) ? `cs>=${difficultyValue}` : ``);
    const rollFormula = `1d20${badassMod}${rollStatMod}${rollMiscBonus}${rollEffectBonus}${rollExtraMod}${rollDifficulty}`;
    const roll = new Roll(
      rollFormula,
      RollBuilder._createDiceRollData(
        { actor: this.actor },
        { extrabonusvalue: extraBonusValue }
      )
    );
    const rollResult = await roll.roll();

    // Display the result.
    if (displayResultOverride && typeof displayResultOverride === 'function') {
      return await displayResultOverride.call(this, dataset, {
        checkStat: "acc",
        checkType: checkType,
        rollResult: rollResult,
        difficultyValue: difficultyValue,
        difficultyEntered: difficultyEntered
      });
    } else {
      return await this._displayCheckRollResultToChat(dataset, {
        checkStat: checkItem.stat,
        checkSubType: checkType,
        rollResult: rollResult, 
        difficultyValue: difficultyValue, 
        difficultyEntered: difficultyEntered 
      });
    }
  }

  /* -------------------------------------------- */
  /*  Chat Displays                               */
  /* -------------------------------------------- */
  async _displayNpcAttackRollResultToChat(dataset, rollObjs) {
    // Pull values from objs.
    const rollResult = rollObjs.rollResult;

    const isFail = rollResult.total <= 1;
    const isCrit = rollResult.total >= 20;
    let bonusDamage = 0;
    if (!isFail && !isCrit) {
      if (rollResult.total >= 8) {
        bonusDamage += 2;
      }
      if (rollResult.total >= 16) {
        bonusDamage += 2;
      }
    }

    const bonusResult = isCrit ?
     "Double damage" 
     : (bonusDamage > 0 ? `Deal +${bonusDamage} damage` : '');

    const templateLocation = 'systems/bunkers-and-badasses/templates/chat/npc-attack-roll.html';
    const chatHtmlContent = await renderTemplate(templateLocation, {
      actorId: this.actor.id,
      diceRoll: `Rolled ${rollResult.formula}.`,
      result: rollResult.result,
      total: rollResult.total,
      success: !isFail,
      failure: isFail,
      isCrit: isCrit,
      bonusResult: bonusResult
    });

    // Prep chat values.
    const flavorText = `${this.actor.name} makes an attack.`;
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: flavorText,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: rollResult,
      rollMode: CONFIG.Dice.rollModes.publicroll,
      content: chatHtmlContent,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u.id)
      speaker: ChatMessage.getSpeaker(),
    }

    // Send the roll to chat!
    return rollResult.toMessage(messageData);
  }

  async _displayMeleeRollResultToChat(dataset, rollObjs) {
    // Pull values from objs.
    const rollResult = rollObjs.rollResult;

    const isFail = rollResult.total <= 1;
    let isPlusOneDice = false;
    let isDoubleDamage = false;
    let isCrit = false;
    let bonusFromAcc = "";
    if (rollResult.total >= 20) {
      bonusFromAcc = "Double Damage";
      isDoubleDamage = true;
    } else if (rollResult.total >= 16) {
      bonusFromAcc = "+1 Damage Dice";
      isPlusOneDice = true;
    }

    if (rollResult.dice[0].results[0].result == 20) {
      bonusFromAcc += (bonusFromAcc === "" ? "" : " + ") + "Crit!";
      isCrit = true;
    }

    const templateLocation = 'systems/bunkers-and-badasses/templates/chat/melee-attack-roll.html';
    const chatHtmlContent = await renderTemplate(templateLocation, {
      actorId: this.actor.id,
      diceRoll: `Rolled ${rollResult.formula}.`,
      result: rollResult.result,
      total: rollResult.total,
      showDamageButton: true,
      bonusFromAcc: bonusFromAcc,
      success: !isFail,
      failure: isFail,
      isPlusOneDice: isPlusOneDice,
      isDoubleDamage: isDoubleDamage,
      isCrit: isCrit,
    });

    // Prep chat values.
    const flavorText = `${this.actor.name} attempts to strike a target.`;
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: flavorText,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: rollResult,
      rollMode: CONFIG.Dice.rollModes.publicroll,
      content: chatHtmlContent,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u.id)
      speaker: ChatMessage.getSpeaker(),
    }

    // Send the roll to chat!
    const chatMessage = rollResult.toMessage(messageData);
  }

  async _displayGunRollResultToChat(dataset, rollObjs) {
    const item = this.actor.items.get(dataset.itemId);
    const itemSystem = item.data.system;

    // Pull values from objs.
    const rollResult = rollObjs.rollResult;

    const isCrit = (rollResult.dice[0].results[0].result === 20);
    const isFail = (rollResult.dice[0].results[0].result === 1);

    // Determine the hits and crits counts.
    let hitsAndCrits = {};
    if (rollResult.total >= 16) {
      hitsAndCrits = {...itemSystem.accuracy.high};
    } else if (rollResult.total >= 8) {
      hitsAndCrits = {...itemSystem.accuracy.mid};
    } else if (rollResult.total >= 2) {
      hitsAndCrits = {...itemSystem.accuracy.low};
    } else {
      hitsAndCrits = { hits: 0, crits: 0 };
    }

    // Account for the bonus crit from a nat 20.
    if (isCrit) {
      hitsAndCrits.crits += 1;
    }

    // Generate message for chat.
    const templateLocation = 'systems/bunkers-and-badasses/templates/chat/gun-attack-roll.html';
    const chatHtmlContent = await renderTemplate(templateLocation, {
      actorId: this.actor.id,
      itemId: item.id,
      diceRoll: `Rolled ${rollResult.formula}.`,
      result: rollResult.result,
      total: rollResult.total,
      redText: itemSystem.redText,
      hits: hitsAndCrits.hits, crits: hitsAndCrits.crits,
      bonusCritsText: isCrit ? "+1 Crit (already added)" : "",
      critHit: isCrit,   success: !isFail,   failure: isFail,
      showDamageButton: !isFail
    });

    // Prep chat values.
    const flavorText = `${this.actor.name} attempts to to shoot with <b>${item.name}</b>.`;
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: flavorText,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: rollResult,
      rollMode: CONFIG.Dice.rollModes.publicroll,
      content: chatHtmlContent,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u.id)
      speaker: ChatMessage.getSpeaker(),
    }

    // Send the roll to chat!
    await rollResult.toMessage(messageData);
    
    this._handleRedText(item);

    return 
  }

  async _displayCheckRollResultToChat(dataset, rollObjs) {
    // Pull values from objs.
    const checkSuperType = dataset.checkType;
    const checkSubType = rollObjs.checkSubType;
    const checkStat = rollObjs.checkStat;
    const rollResult = rollObjs.rollResult;
    const difficultyValue = rollObjs.difficultyValue;
    const difficultyEntered = rollObjs.difficultyEntered;

    const templateLocation = 'systems/bunkers-and-badasses/templates/chat/check-roll.html';
    const chatHtmlContent = await renderTemplate(templateLocation, {
      diceRoll: `Rolled ${rollResult.formula}.`,
      result: rollResult.result,
      total: rollResult.total,
      difficulty: difficultyValue,
      success: difficultyEntered && rollResult.total >= difficultyValue,
      failure: difficultyEntered && rollResult.total < difficultyValue,
    });

    // Prep chat values.
    const checkSubTypeText = (checkSubType != null && checkSubType != "") ? ` (${checkSubType})` : '';
    const flavorText = (dataset.rollType === 'throw') ? `${this.actor.name} attempts to throw an item.` : `${this.actor.name} attempts a ${checkSuperType}${checkSubTypeText} check.`;
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: flavorText,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: rollResult,
      rollMode: CONFIG.Dice.rollModes.publicroll,
      content: chatHtmlContent,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u.id)
      speaker: ChatMessage.getSpeaker(),
    }

    // Send the roll to chat!
    return rollResult.toMessage(messageData);
  }

  async _displayGrenadeRollResultToChat(dataset, rollObjs) {
    const item = this.actor.items.get(dataset.itemId);
    const itemSystem = item.data.system;

    // Pull values from objs.
    const rollResult = rollObjs.rollResult;
    const difficultyValue = rollObjs.difficultyValue;
    const difficultyEntered = rollObjs.difficultyEntered;

    const templateLocation = 'systems/bunkers-and-badasses/templates/chat/check-roll.html';
    const chatHtmlContent = await renderTemplate(templateLocation, {
      actorId: this.actor.id,
      itemId: item.id,
      diceRoll: `Rolled ${rollResult.formula}.`,
      result: rollResult.result,
      total: rollResult.total,
      difficulty: difficultyValue,
      redText: itemSystem.redText,
      showDamageButton: true,
      success: difficultyEntered && rollResult.total >= difficultyValue,
      failure: difficultyEntered && rollResult.total < difficultyValue,
    });

    // Prep chat values.
    const flavorText = `${this.actor.name} attempts to throw a grenade.`;
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: flavorText,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: rollResult,
      rollMode: CONFIG.Dice.rollModes.publicroll,
      content: chatHtmlContent,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u.id)
      speaker: ChatMessage.getSpeaker(),
    }
    
    // Send the roll to chat!
    await rollResult.toMessage(messageData);

    this._handleRedText(item);

    return 
  }

  // Special red text for items.
  _handleRedText(item) {
    const itemSystem = item.data.system;
    if (itemSystem.redTextEffectBM != null && itemSystem.redTextEffectBM != '')
    {
      const user = game.users.get(game.user.id);
      if (user.isGM) 
      {
        const secretMessageData = {
          user: user,
          flavor: `Secret BM only notes for ${this.actor.name}'s <b>${item.name}</b>`,
          content: itemSystem.redTextEffectBM,
          whisper: game.users.filter(u => u.isGM).map(u => u.id),
          speaker: ChatMessage.getSpeaker(),
        };
        return ChatMessage.create(secretMessageData);
      }
      else
      {
        game.socket.emit('show-bm-red-text', {
          item: item
        });
      }
    }
  }

  isNullOrEmpty(value) {
    return value == null || value == '';
  }

}