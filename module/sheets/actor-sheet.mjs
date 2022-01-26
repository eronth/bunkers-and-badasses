import {onManageActiveEffect, prepareActiveEffectCategories} from "../helpers/effects.mjs";

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
      { navSelector: ".builder-tabs", contentSelector: ".builder-body", initial: "archetype" }]
    });
  }

  /** @override */
  get template() {
    return `systems/bunkers-and-badasses/templates/actor/actor-${this.actor.data.type}-sheet.html`;
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
    const actorData = context.actor.data;

    // Add the actor's data to context.data for easier access, as well as flags.
    context.data = actorData.data;
    context.flags = actorData.flags;

    // Prepare character data and items.
    if (actorData.type == 'character') {
      this._prepareItems(context);
      this._prepareArchetypes(context);
      this._prepareExperience(context);
      this._prepareHps(context);
      this._prepareCharacterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == 'npc') {
      this._prepareItems(context);
    }

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);

    return context;
  }

  _prepareArchetypes(context) {
    // Not much transformation to do here. This is primarily to make the values accessible.
    context.archetype1 = context.data.archetypes.archetype1;
    context.archetype2 = context.data.archetypes.archetype2;
  }
  
  _prepareExperience(context) {
    // First, start with the book provided cutoffs.
    const experiencePerSegmentCutoffs = {
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
    }
    
    // Next, use the cutoffs to determine individual exp required to reach each next level.
    let experienceReqs = {};
    let varForNextLevel = 0;
    let totalExpRequiredSoFar = 0;
    const xpSegmentPercents = new Array(10).fill(0);

    Object.entries(experiencePerSegmentCutoffs).forEach(entry => {
      const [level, cutoff] = entry;
      experienceReqs[level] = {toHitThisLevel: 0, toHitNextLevel: 0};
      experienceReqs[level].toHitThisLevel = totalExpRequiredSoFar;
      varForNextLevel = cutoff * 10;
      experienceReqs[level].toHitNextLevel = varForNextLevel;
      totalExpRequiredSoFar += varForNextLevel; // Increment this for the next loop.
    });
    
    // Total up the experience gained for the character and set xp.total value.
    let totalXpGained = 0;
    (context.data.attributes.xp.gains).forEach(expBit => {
      totalXpGained += expBit.value;
    });
    // TODO temporary override until I figure out a cleaner way to manage XP gains.
    totalXpGained = context.data.attributes.xp.value; 
    context.data.attributes.xp.total = totalXpGained;

    // Loop through the thresholds. Find the one where we have enough XP to to be that level
    // but not enough leftover to be higher.
    Object.entries(experienceReqs).forEach(entry => {
      const [level, req] = entry;
      if (totalXpGained >= req.toHitThisLevel) {
        let leftoverXP = totalXpGained - req.toHitThisLevel;
        if (leftoverXP < req.toHitNextLevel || level == '30') {
          context.data.attributes.level = level;
          context.data.attributes.xp.level = level; // I fucked up and tracked the level in two places.
          // Track current experience in the current level... just in case.
          context.data.attributes.xp.soFarInLevel = leftoverXP;
          context.data.attributes.xp.currentSegment = 
            Math.ceil((leftoverXP+1)/experiencePerSegmentCutoffs[level]);
          context.data.attributes.xp.XpPerSegment = experiencePerSegmentCutoffs[level];
        }
      }
    });

    // Make it easier to access the experience data.
    context.xp = context.data.attributes.xp;

    // Calculate the percentage completion of each xp segment
    // for progress bar rendering via handlebars.
    xpSegmentPercents.forEach((segment, index, xpSegmentPercents) => {
      if (context.data.attributes.xp.level == '30') {
        xpSegmentPercents[index] = 100;
      } else if ((index+1) < context.xp.currentSegment) {
        xpSegmentPercents[index] = 100;
      } else if ((index+1) > context.xp.currentSegment) {
        xpSegmentPercents[index] = 0;
      } else {
        // We should only be here when the segment is the currently active one.
        let xpInThisSegment = context.xp.soFarInLevel - (context.xp.XpPerSegment * (index)); // not index+1 because we need to remove the xp from before that, not including it.
        // Modify to % value.
        xpSegmentPercents[index] = 100 * xpInThisSegment / context.xp.XpPerSegment;
        context.xp.soFarInSegment = xpInThisSegment;
      }
    });

    context.xp.xpSegmentPercents = xpSegmentPercents;
  }

  _prepareHps(context) {
    // Get the HPs from the actor data.
    Object.entries(context.items).forEach(entry => {
      const [itemId, itemData] = entry;
      if (itemData.type === "shield" && itemData.data.equipped) {
        if (itemData.data.isArmor) {
          context.data.attributes.hps.armor.max = itemData.data.capacity;
          context.data.attributes.hps.armor.regen = itemData.data.recovery.repairRate;
        } else {
          context.data.attributes.hps.shield.max = itemData.data.capacity;
          context.data.attributes.hps.shield.regen = itemData.data.recovery.rechargeRate;
        }
      }
    });

    let useArmor = game.settings.get('bunkers-and-badasses', 'usePlayerArmor');
    let usedHps = {};
    Object.entries(context.data.attributes.hps).forEach(entry => {
      const [hpType, hpData] = entry;
      if (hpType !== "armor" || (hpType === "armor" && useArmor)) {
        usedHps[hpType] = hpData;
      }
    });

    context.hps = usedHps;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterData(context) {
    // Handle stat scores.
    for (let [k, v] of Object.entries(context.data.stats)) {
      v.label = game.i18n.localize(CONFIG.BNB.stats[k]) ?? k;
    }

    // Handle hp scores.
    for (let [k, v] of Object.entries(context.data.attributes.hps)) {
      v.label = game.i18n.localize(CONFIG.BNB.hps[k]) ?? k;
    }
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context) {
    // Initialize containers.
    const gear = [];
    const features = [];
    const skills = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: []
    }
    const guns = [];
    const equippedGuns = [];
    const shields = [];
    const grenades = [];
    const equippedGrenades = [];
    const relics = [];
    const potions = [];
    const archetypeFeats = [];
    const classSkills = [];

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || DEFAULT_TOKEN;
      
      if (i.type === 'item') {
        gear.push(i); // Append to gear.
      } else if (i.type === 'feature') {
        features.push(i); // Append to features.
      } else if (i.type === 'skill') {
        if (i.data.tier != null) {
          skills[i.data.tier].push(i); // Append to skill.
        }
      } else if (i.type === 'Archetype Feat') {
        archetypeFeats.push(i); // Append to archetype Feats.
      } else if (i.type === 'Class Skill') {
        classSkills.push(i); // Append to class Skills.
      } else if (i.type === 'gun') {
        let elemIcon = "";
        let gunDmgString = "";
        const finalPlus = `<label class="element-damage-plus"> + </label>`;
        Object.entries(i.data.elements).forEach(e => {
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
        
        i.data.dmgHtml = gunDmgString;
        guns.push(i);
        if (i.data.equipped) {
          equippedGuns.push(i);
        }
      } else if (i.type === 'shield') {
        let shieldResistString = "";
        Object.entries(i.data.elements).forEach(e => {
          const element = e[1];
          if(element.enabled) {
            shieldResistString += `<img id="resist${element.label}" alt="${element.label}" 
              class="element-resist-icon" src="systems/bunkers-and-badasses/assets/elements/${element.label}.png" />`;
          }
        });
        i.data.resistHtml = shieldResistString;
        shields.push(i);
      } else if (i.type === 'grenade') {
        let grenadeDmgString = "";
        let elemIcon = "";
        const finalPlus = `<label class="element-damage-plus"> + </label>`;
        Object.entries(i.data.elements).forEach(e => {
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

        i.data.dmgHtml = grenadeDmgString;
        grenades.push(i);
        if (i.data.equipped) {
          equippedGrenades.push(i);
        }
      } else if (i.type === 'relic') {
        relics.push(i);
      } else if (i.type === 'potion') {
        potions.push(i);
      }
    }

    // Assign and return
    context.gear = gear;
    context.features = features;
    context.skills = skills;
    context.archetypeFeats = archetypeFeats;
    context.classSkills = classSkills;
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
    //   item.data.data.equipped = !item.data.data.equipped;
    //   var hello="hello"
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

    // Handle HP Gains.
    html.find('.hp-gain').click(this._onHpGain.bind(this));
    // html.find('.hp-gain-create').click(this._onHpGaindCreate.bind(this));
    // html.find('.hp-gain-edit').click(this._onHpGainEdit.bind(this));
    // html.find('.hp-gain-delete').click(this._onHpGainDelete.bind(this));

    // Handle XP Gains.
    html.find('.xp-gain').click(this._onXpGain.bind(this));
    // html.find('.xp-gain-create').click(this._onXpGainCreate.bind(this));
    // html.find('.xp-gain-edit').click(this._onXpGainEdit.bind(this));
    // html.find('.xp-gain-delete').click(this._onXpGainDelete.bind(this));

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
    let archetypeNum = event.currentTarget.dataset.archetypeNumber;
    let archetypeRewards = this.actor.data.data.archetypes["archetype" + archetypeNum].rewards;

    // Figure out the current archetype highest level.
    let highestLevel = 0;
    archetypeRewards.forEach(archetypeReward => {
      if (archetypeReward.Level > highestLevel) {
        highestLevel = archetypeReward.Level;
      }
    });

    archetypeRewards.push({ Level: highestLevel+1, Description: "" });

    // Square brackets needed to get the right value.
    const archetypeRewardsLabel = "data.archetypes.archetype"+archetypeNum+".rewards";
    this.actor.update({[archetypeRewardsLabel]: archetypeRewards});
  }

  async _onArchetypeRewardEdit(event) {
    event.preventDefault();

    var archetypeNum = event.currentTarget.dataset.archetypeNumber;
    var rewardIndex = event.currentTarget.dataset.rewardIndex;
    var archetype = this.actor.data.data.archetypes["archetype" + archetypeNum];

    let htmlContent = await renderTemplate("systems/bunkers-and-badasses/templates/dialog/archetype-reward.html", {
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
    let levelValue = parseInt(html.find("#archetypeLevel")[0].value);
    let descriptionValue = html.find("#rewardText")[0].value;

    let archetypeNum = parseInt(html.find("#archetypeNum")[0].value);
    let archetype = this.actor.data.data.archetypes["archetype" + archetypeNum];

    let rewardIndex = parseInt(html.find("#rewardIndex")[0].value);

    // Prep data with updated values.
    archetype.rewards[rewardIndex]["Level"] = levelValue;
    archetype.rewards[rewardIndex]["Description"] = descriptionValue;

    archetype.rewards.sort((a, b) => a.Level - b.Level);

    // Square brackets needed to get the right value.
    this.actor.update({["data.archetypes.archetype"+archetypeNum+".rewards"]: archetype.rewards});
  }

  _onArchetypeRewardDelete(event) {
    // Pull data from event.
    var archetypeNum = event.currentTarget.dataset.archetypeNumber;
    var rewardIndex = event.currentTarget.dataset.rewardIndex;
    var archetype = this.actor.data.data.archetypes["archetype" + archetypeNum];
    
    // Prep data for saving.
    archetype.rewards.splice(rewardIndex, 1);
    
    // Square brackets needed to get the right value.
    this.actor.update({["data.archetypes.archetype"+archetypeNum+".rewards"]: archetype.rewards});
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
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      data: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.data["type"];

    // Finally, create the item!
    return await Item.create(itemData, {parent: this.actor});
  }
  _onItemCheckbox(event) {
    let target = $(event.currentTarget).attr("data-target")
    if (target == "item") {
      target = $(event.currentTarget).attr("data-item-target")
      let item = this.actor.items.get($(event.currentTarget).parents(".item").attr("data-item-id"))
      return item.update({ [`${target}`]: !getProperty(item.data, target) })
    }
    if (target)
      return this.actor.update({[`${target}`] : !getProperty(this.actor.data, target)});
  }

  async _onHpGain(event) {
    return await this._attributeGainDialog(event);
  }
  async _onXpGain(event) {
    return await this._attributeGainDialog(event);
  }
  async _attributeGainDialog(event) {
    // Prep data to access.
    const actorData = this.actor.data.data;
    const dataset = event.currentTarget.dataset;

    const dialogHtmlContent = await renderTemplate("systems/bunkers-and-badasses/templates/dialog/gain-attribute.html", {
      attributeName: dataset.attributeName,
    });

    this.gain = new Dialog({
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
            return await this._gainAttribute(dataset, html);
          }
        }
      }
    }).render(true);
  }

  async _gainAttribute(dataset, html) {
    // Prep data to access.
    const actorData = this.actor.data.data;

    // Pull data from html.
    const gainAmount = parseInt(html.find("#attribute-gain-input")[0].value);
    if (isNaN(gainAmount)) { return; }

    // Update actor data.
    const attribute = this._deepFind(actorData, dataset.dataPath);
    attribute.gains.push({ value: gainAmount, reason: "Add Clicked" });
    //actorData.attributes.xp.total += gainAmount;
    attribute.value += gainAmount;
    if (attribute.max != null) {
      attribute.max += gainAmount; 
    }
    // Square brackets needed to get the right value.
    const attributeLabel = `data.${dataset.dataPath}`;
    await this.actor.update({[attributeLabel]: attribute});

    return 
  }

  _deepFind(obj, path) {
    var paths = path.split('.')
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
    // if (target == "item") {
    //     target = $(event.currentTarget).attr("data-item-target")
    //     let item = this.actor.items.get($(event.currentTarget).parents(".item").attr("data-item-id"))
    //     return item.update({ [`${target}`]: !getProperty(item.data, target) })
    // }
    if (target)
        return this.actor.update({[`${target}`] : !getProperty(this.actor.data, target)});
  }

  _expandItemDropdown(event) {
    let id = $(event.currentTarget).attr("data-item-id")
    let item = this.actor.items.get(id)
    if (item && event.button == 0)
      this._createDropdown(event, { text: item.data.data.description });
    else if (item)
      item.sheet.render(true)
  }

  _createDropdown(event, dropdownData) {
    let dropdownHTML = ""
    event.preventDefault()
    let li = $(event.currentTarget).parents(".item-element-group")
    // Toggle expansion for an item
    if (li.hasClass("expanded")) // If expansion already shown - remove
    {
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
        if (item) return item.roll();
      } else if (dataset.rollType == 'melee-dice-roll') {
        return this._meleeAndHPDiceRoll(dataset);
      } else if (dataset.rollType == 'check') {
        return this._checkRoll(dataset);
      } else if (dataset.rollType == 'badass') {
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
      } 

    }
    
    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? `[ability] ${dataset.label}` : '';
      let roll = new Roll(dataset.roll, this.actor.getRollData()).roll();
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return roll;
    }
  }
  
  /* -------------------------------------------- */
  /*  Various roll starters                       */
  /* -------------------------------------------- */
  async _meleeAndHPDiceRoll(dataset) {
    const actorData = this.actor.data.data;

    const roll = new Roll(`${actorData.class.meleeDice}[Melee Dice] + @mstMod[MST mod]`, {
      mstMod: actorData.stats.mst.mod,
    });
    const rollResult = roll.roll();

    const flavorText = `${this.actor.name} rolls their Melee Dice.`;
    return rollResult.toMessage({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: flavorText,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: rollResult,
      rollMode: CONFIG.Dice.rollModes.roll,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u._id)
      speaker: ChatMessage.getSpeaker(),
    });
  }

  async _checkRoll(dataset) {
    // Prep data to access.
    const actorData = this.actor.data.data;
    const check = actorData.checks[dataset.checkType.toLowerCase()];
    if (check.nonRolled) return; // Special case for movement, since I (potentially foolishly) bundled it with checks.
    if (dataset.checkType.toLowerCase() === 'initiative') {
      return this.actor.rollInitiative({createCombatants: true});
    }

    return await this._makeCheck(dataset, {
      checkTitle: `${actorData[check.stat].label} Check`,
      checkItem: check,
      promptCheckType: true
    });
  }

  async _badassRoll(dataset) {

  }
  
  async _healthRegainRoll(dataset) {
    // Prep data to access.
    const actorData = this.actor.data.data;
    const hp = actorData.attributes.hps[dataset.healthType.toLowerCase()];
    const hpRegainAction = {
      shield: "recharges",
      armor: "repairs",
      flesh: "regens"
    }
    
    // Prepare and roll the check.
    const roll = new Roll(`${hp.regen}`, {});
    const rollResult = roll.roll();

    // Prep chat values.
    const flavorText = `${this.actor.name} ${hpRegainAction[dataset.healthType.toLowerCase()]} ${rollResult.total} <b>${hp.label}</b>.`;
    const messageData = {
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: flavorText,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: rollResult,
      rollMode: CONFIG.Dice.rollModes.roll,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u._id)
      speaker: ChatMessage.getSpeaker(),
    }

    // Update the appopriate values.
    let newValue = hp.value + rollResult.total;
    if (newValue > hp.max) newValue = hp.max;
    const target = "data.attributes.hps." + dataset.healthType.toLowerCase() + ".value";
    this.actor.update({[`${target}`] : newValue});

    // Send the roll to chat!
    return rollResult.toMessage(messageData);
  }

  async _meleeAttackRoll(dataset) {
    // Prep data to access.
    const actorData = this.actor.data.data;    

    const dialogHtmlContent = await renderTemplate("systems/bunkers-and-badasses/templates/dialog/attack-confirmation.html", {
      type: "Melee",
      attack: actorData.checks.melee,
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
    const actorData = this.actor.data.data;

    // const checkItem = checkObjects.checkItem;
    // const checkTitle = checkObjects.checkTitle;
    // const defaultDifficulty = checkObjects.defaultDifficulty;
    // const promptCheckType = checkObjects.promptCheckType;
    

    // const dialogHtmlContent = await renderTemplate("systems/bunkers-and-badasses/templates/dialog/check-difficulty.html", {
    //   attributes: actorData.attributes,
    //   check: checkItem,
    //   promptCheckType: promptCheckType ?? false,
    //   defaultDifficulty: defaultDifficulty,
    // });

    // this.check = new Dialog({
    //   title: checkTitle,
    //   Id: "check-difficulty",
    //   content: dialogHtmlContent,
    //   buttons: {
    //     "Cancel" : {
    //       label : "Cancel",
    //       callback : async (html) => {}
    //     },
    //     "Roll" : {
    //       label : "Roll",
    //       callback : async (html) => {
    //         return await this._rollCheckDice(dataset, html, checkItem, displayResultOverride);
    //       }
    //     }
    //   }
    // }).render(true);
  }

  async _grenadeThrowRoll(dataset) {
    // Prep data to access.
    const actorData = this.actor.data.data;

    const throwCheck = {
      stat: "acc",
      value: actorData.stats.acc.modToUse,
      bonus: actorData.stats.acc.bonus,
      usesBadassRank: false,
    }
    throwCheck.total = throwCheck.value + throwCheck.bonus;

    return await this._makeCheck(dataset, {
      checkItem: throwCheck,
      checkTitle: "Grenade Throw Check",
      defaultDifficulty: 12
    }, this._displayGrenadeRollResultToChat);
  }

  async _itemThrowRoll(dataset) {
    // Prep data to access.
    const actorData = this.actor.data.data;

    const throwCheck = {
      stat: "acc",
      value: actorData.stats.acc.modToUse,
      bonus: actorData.stats.acc.bonus,
      usesBadassRank: false,
    }
    throwCheck.total = throwCheck.value + throwCheck.bonus;

    return await this._makeCheck(dataset, {
      checkItem: throwCheck,
      checkTitle: "Item Throw Check",
      defaultDifficulty: 12
    });
  }

  async _makeCheck(dataset, checkObjects, displayResultOverride) {
    // Prep data to access.
    const actorData = this.actor.data.data;

    const checkItem = checkObjects.checkItem;
    const checkTitle = checkObjects.checkTitle;
    const defaultDifficulty = checkObjects.defaultDifficulty;
    const promptCheckType = checkObjects.promptCheckType;
    

    const dialogHtmlContent = await renderTemplate("systems/bunkers-and-badasses/templates/dialog/check-difficulty.html", {
      attributes: actorData.attributes,
      check: checkItem,
      promptCheckType: promptCheckType ?? false,
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
  async _rollMeleeAttackDice(dataset, html) {
    // Prep data to access.
    const actorData = this.actor.data.data;

    // Pull data from html.
    const extraBonusValue = parseInt(html.find("#extra")[0].value);

    // Prepare and roll the check.
    const rollStatMod = ` + @statMod[acc ${actorData.attributes.badassRollsEnabled ? 'stat' : 'mod'}]`;
    const rollMiscMod = ` + @miscBonus[misc bonus]`;
    const rollBonusMod = isNaN(extraBonusValue) ? '' : ` + ${extraBonusValue}`;
    const roll = new Roll(`1d20${rollStatMod}${rollMiscMod}${rollBonusMod}`, {
      acc: actorData.checks.melee.value,
      misc: actorData.checks.melee.bonus,
      extra: extraBonusValue
    });
    const rollResult = roll.roll();

    // Display the result.
    return await this._displayMeleeRollResultToChat(dataset, { rollResult: rollResult });

  }

  async _rollCheckDice(dataset, html, checkItem, displayResultOverride) {
    // Prep data to access.
    const actorData = this.actor.data.data;

    // Pull data from html.
    const extraBonusValue = parseInt(html.find("#extra")[0].value);
    const difficultyValue = parseInt(html.find("#difficulty")[0].value);            
    const difficultyEntered = !isNaN(difficultyValue);

    // Prepare and roll the check.
    const badassMod = checkItem.usesBadassRank ? ' + @badassRank[badass rank]' : ''
    const rollStatMod = ` + @statMod[acc ${actorData.attributes.badassRollsEnabled ? 'stat' : 'mod'}]`;
    const rollMiscMod = ` + @miscBonus[misc bonus]`;
    const rollBonusMod = (isNaN(extraBonusValue) || extraBonusValue == 0 ? '' : ` + @extraBonus[extra bonus]`);
    const rollDifficulty = ((difficultyValue != null && !isNaN(difficulty)) ?
      `cs>=${difficultyValue}` :
      ``);

    const roll = new Roll(`1d20${badassMod}${rollStatMod}${rollMiscMod}${rollBonusMod}${rollDifficulty}`, {
      badassRank: actorData.attributes.badassRank,
      statMod: checkItem.value,
      miscBonus: checkItem.bonus,
      extraBonus: extraBonusValue,
    });
    const rollResult = roll.roll();

    // Display the result.
    if (displayResultOverride && typeof displayResultOverride === 'function') {
      return await displayResultOverride.call(this, dataset, {
        rollResult: rollResult,
        difficultyValue: difficultyValue,
        difficultyEntered: difficultyEntered
      });
    } else {
      return await this._displayCheckRollResultToChat(dataset, { 
        rollResult: rollResult, 
        difficultyValue: difficultyValue, 
        difficultyEntered: difficultyEntered });
    }
  }

  /* -------------------------------------------- */
  /*  Chat Displays                               */
  /* -------------------------------------------- */
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

    const chatHtmlContent = await renderTemplate("systems/bunkers-and-badasses/templates/chat/melee-attack-roll.html", {
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
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: flavorText,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: rollResult,
      rollMode: CONFIG.Dice.rollModes.roll,
      content: chatHtmlContent,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u._id)
      speaker: ChatMessage.getSpeaker(),
    }

    // Send the roll to chat!
    const chatMessage = ChatMessage.create(messageData);
  }

  async _displayCheckRollResultToChat(dataset, rollObjs) {
    // Pull values from objs.
    const rollResult = rollObjs.rollResult;
    const difficultyValue = rollObjs.difficultyValue;
    const difficultyEntered = rollObjs.difficultyEntered;

    const chatHtmlContent = await renderTemplate("systems/bunkers-and-badasses/templates/chat/check-roll.html", {
      diceRoll: `Rolled ${rollResult.formula}.`,
      result: rollResult.result,
      total: rollResult.total,
      difficulty: difficultyValue,
      success: difficultyEntered && rollResult.total >= difficultyValue,
      failure: difficultyEntered && rollResult.total < difficultyValue,
    });

    // Prep chat values.
    const flavorText = `${this.actor.name} attempts to throw an item.`;
    const messageData = {
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: flavorText,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: rollResult,
      rollMode: CONFIG.Dice.rollModes.roll,
      content: chatHtmlContent,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u._id)
      speaker: ChatMessage.getSpeaker(),
    }

    // Send the roll to chat!
    return ChatMessage.create(messageData);
  }

  async _displayGrenadeRollResultToChat(dataset, rollObjs) {
    const item = this.actor.items.get(dataset.itemId);
    const itemData = item.data.data;

    // Pull values from objs.
    const rollResult = rollObjs.rollResult;
    const difficultyValue = rollObjs.difficultyValue;
    const difficultyEntered = rollObjs.difficultyEntered;

    const chatHtmlContent = await renderTemplate("systems/bunkers-and-badasses/templates/chat/check-roll.html", {
      actorId: this.actor.id,
      itemId: item.id,
      diceRoll: `Rolled ${rollResult.formula}.`,
      result: rollResult.result,
      total: rollResult.total,
      difficulty: difficultyValue,
      redText: itemData.redText,
      showDamageButton: true,
      success: difficultyEntered && rollResult.total >= difficultyValue,
      failure: difficultyEntered && rollResult.total < difficultyValue,
    });

    // Prep chat values.
    const flavorText = `${this.actor.name} attempts to throw a grenade.`;
    const messageData = {
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: flavorText,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: rollResult,
      rollMode: CONFIG.Dice.rollModes.roll,
      content: chatHtmlContent,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u._id)
      speaker: ChatMessage.getSpeaker(),
    }

    // Send the roll to chat!
    const chatMessage = ChatMessage.create(messageData);

    if (itemData.redTextEffectBM != null && itemData.redTextEffectBM != "") {
      const testmap = game.users.entities.filter(u => u.isGM).map(u => u._id);
      const secretMessageData = {
        user: game.users.entities.filter(u => u.isGM).map(u => u._id)[0],
        flavor: `Secret BM only notes for ${this.actor.name}'s ${item.name}`,
        content: itemData.redTextEffectBM,
        whisper: game.users.entities.filter(u => u.isGM).map(u => u._id),
        speaker: ChatMessage.getSpeaker(),
      };
      ChatMessage.create(secretMessageData);
    }

    return chatMessage;
  }

}
