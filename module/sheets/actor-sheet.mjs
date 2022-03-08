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

    // Prepare Vault Hunter data and items.
    if (actorData.type == 'vault hunter') {
      this._prepareItems(context);
      this._prepareArchetypes(context);
      this._prepareExperience(context);
      this._prepareHps(context);
      this._prepareVaultHunterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == 'npc') {
      this._prepareItems(context);
      this._prepareNpcHps(context);
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
    const experiencePerSegmentCutoffs = this._getExperiencePerSegmentCutoffsList();
    
    // Next, use the cutoffs to determine individual exp required to reach each next level.
    const experienceReqs = this._generateExperienceRequirements();
    
    // Total up the experience gained for the vault hunter and set xp.total value.
    let totalXpGained = 0;
    (context.data.attributes.xp.gains).forEach(expBit => {
      totalXpGained += expBit.value;
    });
    // TODO temporary override until I figure out a cleaner way to manage XP gains popup.
    totalXpGained = context.data.attributes.xp.value; 
    context.data.attributes.xp.total = totalXpGained;

    // Loop through the thresholds. Find the one where we have enough XP to to be that level
    // but not enough leftover to be higher.
    Object.entries(experienceReqs).forEach(entry => {
      const [level, req] = entry;
      if (totalXpGained >= req.toHitThisLevel) {
        const leftoverXP = totalXpGained - req.toHitThisLevel;
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
    const xpSegmentPercents = new Array(10).fill(0);
    xpSegmentPercents.forEach((segment, index, xpSegmentPercents) => {
      if (context.data.attributes.xp.level == '30') {
        xpSegmentPercents[index] = 100;
      } else if ((index+1) < context.xp.currentSegment) {
        xpSegmentPercents[index] = 100;
      } else if ((index+1) > context.xp.currentSegment) {
        xpSegmentPercents[index] = 0;
      } else {
        // We should only be here when the segment is the currently active one.
        const xpInThisSegment = context.xp.soFarInLevel - (context.xp.XpPerSegment * (index)); // not index+1 because we need to remove the xp from before that, not including it.
        // Modify to % value.
        xpSegmentPercents[index] = 100 * xpInThisSegment / context.xp.XpPerSegment;
        context.xp.soFarInSegment = xpInThisSegment;
      }
    });

    context.xp.xpSegmentPercents = xpSegmentPercents;
  }

  _getExperiencePerSegmentCutoffsList() {
    return {
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

  _prepareNpcHps(context) {
    context.hps = context.data.attributes.hps;
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
    for (let [k, v] of Object.entries(context.data.stats)) {
      v.label = game.i18n.localize(CONFIG.BNB.stats[k]) ?? k;
    }

    // Handle hp scores.
    for (let [k, v] of Object.entries(context.data.attributes.hps)) {
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
        if (i.data.tier != null) {
          skills[i.data.tier].push(i); // Append to skill.
        }
      } else if (i.type === 'Archetype Feat') {
        archetypeFeats.push(i); // Append to archetype Feats.
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
    const archetypeRewards = this.actor.data.data.archetypes["archetype" + archetypeNum].rewards;

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

    const archetypeNum = event.currentTarget.dataset.archetypeNumber;
    const rewardIndex = event.currentTarget.dataset.rewardIndex;
    const archetype = this.actor.data.data.archetypes["archetype" + archetypeNum];

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
    let archetype = this.actor.data.data.archetypes["archetype" + archetypeNum];

    const rewardIndex = parseInt(html.find("#rewardIndex")[0].value);

    // Prep data with updated values.
    archetype.rewards[rewardIndex]["Level"] = levelValue;
    archetype.rewards[rewardIndex]["Description"] = descriptionValue;

    archetype.rewards.sort((a, b) => a.Level - b.Level);

    // Square brackets needed to get the right value.
    this.actor.update({["data.archetypes.archetype"+archetypeNum+".rewards"]: archetype.rewards});
  }

  _onArchetypeRewardDelete(event) {
    // Pull data from event.
    const archetypeNum = event.currentTarget.dataset.archetypeNumber;
    const rewardIndex = event.currentTarget.dataset.rewardIndex;
    const archetype = this.actor.data.data.archetypes["archetype" + archetypeNum];
    
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

  async _onActionSkillEdit(event) {
    // Prep data to access.
    const actorData = this.actor.data.data;
    const dataset = event.currentTarget.dataset;
    const actionSkill = actorData.class.actionSkill;

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
    return await this.actor.update({"data.class.actionSkill": actionSkill});
  }

  async _onActionSkillUse() {
    // Prep data
    const actorData = this.actor.data.data;

    // Prep chat values.
    const flavorText = `${this.actor.name} uses ${actorData.class.actionSkill.name}.`;
    const messageContent = actorData.class.actionSkill.description;
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
    const actorData = this.actor.data.data;
    const hps = actorData.attributes.hps;

    // Pull data from html.
    const damageAmount = html.find("#damage-value")[0].value;
    const damageType = $("input[type=radio][name=damage-type-element]:checked")[0].dataset.element.toLowerCase();

    if (isNaN(damageAmount) || damageAmount <= 0) { return; }

    // Track the amount of damage done to each health type.
    let shieldDamageTaken = 0;
    let armorDamageTaken = 0;
    let fleshDamageTaken = 0;

    // Update the actor.
    for (let damageToDeal = damageAmount; damageToDeal > 0; damageToDeal--) {
      if (actorData.attributes.hps.shield.value > shieldDamageTaken && 
        (damageType !== "radiation" && damageType !== "incendiation")) {
        shieldDamageTaken++;
        if (damageType === 'shock' || damageType === 'corroshock') {
          shieldDamageTaken++;
        }
      } else if (actorData.attributes.hps.armor.value > armorDamageTaken) {
        armorDamageTaken++;
        if (damageType === 'corrosive' || damageType === 'corroshock') {
          armorDamageTaken++;
        }
      } else if (actorData.attributes.hps.flesh.value > fleshDamageTaken) {
        fleshDamageTaken++;
        if (damageType === 'incendiary' || damageType === 'incendiation') {
          fleshDamageTaken++;
        }
      }
    }

    // Don't overshoot! Going forward this will help with displaying the damage to chat.
    if (shieldDamageTaken > actorData.attributes.hps.shield.value) {
      shieldDamageTaken = actorData.attributes.hps.shield.value;
    }
    if (armorDamageTaken > actorData.attributes.hps.armor.value) {
      armorDamageTaken = actorData.attributes.hps.armor.value;
    }
    if (fleshDamageTaken > actorData.attributes.hps.flesh.value) {
      fleshDamageTaken = actorData.attributes.hps.flesh.value;
    }

    // TODO Display the damage to chat.

    hps.shield.value -= shieldDamageTaken;
    hps.armor.value -= armorDamageTaken;
    hps.flesh.value -= fleshDamageTaken;

    // Square brackets needed to get the right value.
    const attributeLabel = `data.attributes.hps`;
    return await this.actor.update({[attributeLabel]: hps});
  }

  async _onHpGain(event) {
    return await this._attributeGainDialog(event);
  }
  async _onXpGain(event) {
    return await this._attributeGainDialog(event);
  }
  async _attributeGainDialog(event) {
    // Prep data.
    const actorData = this.actor.data.data;
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

    // Update the actor.
    const attribute = this._deepFind(actorData, dataset.dataPath);
    attribute.gains.push({ value: gainAmount, reason: "Add Clicked" });
    attribute.value += gainAmount;
    if (attribute.max != null) {
      attribute.max += gainAmount; 
    }
    // Square brackets needed to get the right value.
    const attributeLabel = `data.${dataset.dataPath}`;
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
    const actorData = this.actor.data.data;

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

    this.actor.update({"data.attributes.xp.value": newXp.value});
    this.actor.update({"data.attributes.xp.total": newXp.total});
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
    const actorData = this.actor.data.data;    

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
    const actorData = this.actor.data.data;
    const actionObject = this._deepFind(actorData, dataset.path.replace('data.', ''));

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
    const actorData = this.actor.data.data;

    const rollFormula = `${actorData.class.meleeDice}[Melee Dice] + @mstmod[MST mod]`;
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
    // Prep data to access.
    const actorData = this.actor.data.data;

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
    badassTotal += actorData.attributes.badass.rank;

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
    const actorData = this.actor.data.data;
    const hp = actorData.attributes.hps[dataset.healthType.toLowerCase()];
    const hpRegainAction = {
      shield: "recharges",
      armor: "repairs",
      flesh: "regens"
    }
    
    // Prepare and roll the check.
    const roll = new Roll(
      `${hp.regen}`,
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
    const target = "data.attributes.hps." + dataset.healthType.toLowerCase() + ".value";
    this.actor.update({[`${target}`] : newValue});

    // Send the roll to chat!
    return rollResult.toMessage(messageData);
  }

  async _meleeAttackRoll(dataset) {
    // Prep data to access.
    const actorData = this.actor.data.data;

    const templateLocation = 'systems/bunkers-and-badasses/templates/dialog/attack-confirmation.html';
    const dialogHtmlContent = await renderTemplate(templateLocation, {
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
    const item = this.actor.items.get(dataset.itemId);
    const itemData = item.data.data;

    const attackValues = {...actorData.checks.shooting};
    attackValues.badassRollsEnabled = actorData.attributes.badass.rollsEnabled;
    
    const isFavoredWeaponType = actorData.favored[itemData.type.value];
    const templateLocation = "systems/bunkers-and-badasses/templates/dialog/attack-confirmation.html";
    const dialogHtmlContent = await renderTemplate(templateLocation, {
      type: "Gun",
      attack: attackValues,
      showGearMod: true,
      gearAcc: itemData.statMods.acc,
      showFavored: true,
      favored: isFavoredWeaponType
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
            return await this._rollGunAttackDice(dataset, html, itemData.statMods, itemData.special.overrideType);
          }
        }
      }
    }).render(true);
  }

  async _grenadeThrowRoll(dataset) {
    // Prep data to access.
    const actorData = this.actor.data.data;

    const throwCheck = {
      stat: "acc",
      value: actorData.stats.acc.modToUse,
      misc: 0,
      effects: actorData.bonus.checks.throw,
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
    const actorData = this.actor.data.data;

    const throwCheck = {
      stat: "acc",
      value: actorData.stats.acc.modToUse,
      misc: 0,
      effects: actorData.bonus.checks.throw,
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
    const actorData = this.actor.data.data;

    const checkItem = checkObjects.checkItem;
    const checkTitle = checkObjects.checkTitle;
    const defaultDifficulty = checkObjects.defaultDifficulty;
    const promptCheckType = checkObjects.promptCheckType;
    
    const templateLocation = 'systems/bunkers-and-badasses/templates/dialog/check-difficulty.html';
    const dialogHtmlContent = await renderTemplate(templateLocation, {
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
  async _rollNpcAttackDice(dataset, html) {
    // Prep data to access.
    const actorData = this.actor.data.data;

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
    const actorData = this.actor.data.data;

    // Pull data from html.
    const extraBonusValue = parseInt(html.find("#extra")[0].value);

    // Prepare and roll the check.
    const rollStatMod = ` + @acc[ACC ${actorData.attributes.badass.rollsEnabled ? 'Stat' : 'Mod'}]`;
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
    const actorData = this.actor.data.data;

    // Pull data from html.
    const extraBonusValue = parseInt(html.find("#extra")[0].value);
    const isFavored = html.find("#favored-checkbox")[0].checked;

    // Prepare and roll the check.
    const rollStatMod = isFavored ? ` + @acc[ACC ${actorData.attributes.badass.rollsEnabled ? 'Stat' : 'Mod'}]` : '';
    const rollGearAccBonus = ` + @gearacc[Gear ACC]`;
    
    // SPECIAL special logic for a unique legendary.
    const rollMstMod = (itemOverrideType.toLowerCase() === 'mwbg') ? ` + @mst[MST ${actorData.attributes.badass.rollsEnabled ? 'Stat' : 'Mod'}]` : '';
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
    const actorData = this.actor.data.data;
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
    const rollStatMod = ` + @${checkStat.toLowerCase()}[${checkStat.toUpperCase()} ${actorData.attributes.badass.rollsEnabled ? 'Stat' : 'Mod'}]`;
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
    const itemData = item.data.data;

    // Pull values from objs.
    const rollResult = rollObjs.rollResult;

    const isCrit = (rollResult.dice[0].results[0].result === 20);
    const isFail = (rollResult.dice[0].results[0].result === 1);

    // Determine the hits and crits counts.
    let hitsAndCrits = {};
    if (rollResult.total >= 16) {
      hitsAndCrits = {...itemData.accuracy.high};
    } else if (rollResult.total >= 8) {
      hitsAndCrits = {...itemData.accuracy.mid};
    } else if (rollResult.total >= 2) {
      hitsAndCrits = {...itemData.accuracy.low};
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
      redText: itemData.redText,
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
    const itemData = item.data.data;

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
      redText: itemData.redText,
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
    const itemData = item.data.data;
    if (itemData.redTextEffectBM != null && itemData.redTextEffectBM != '')
    {
      const user = game.users.get(game.user.id);
      if (user.isGM) 
      {
        const secretMessageData = {
          user: user,
          flavor: `Secret BM only notes for ${this.actor.name}'s <b>${item.name}</b>`,
          content: itemData.redTextEffectBM,
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

}
