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
    let xpSegmentPercents = new Array(10).fill(0);

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
    context.data.attributes.xp.total = totalXpGained;

    // Loop through the thresholds. Find the one where we have enough XP to to be that level
    // but not enough leftover to be higher.
    Object.entries(experienceReqs).forEach(entry => {
      const [level, req] = entry;
      if (totalXpGained >= req.toHitThisLevel) {
        let leftoverXP = totalXpGained - req.toHitThisLevel;
        if (leftoverXP < req.toHitNextLevel) {
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
      if ((index+1) < context.xp.currentSegment) {
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
          context.data.hps.armor.max = itemData.data.capacity;
          context.data.hps.armor.regen = itemData.data.recovery.repairRate;
        } else {
          context.data.hps.shield.max = itemData.data.capacity;
          context.data.hps.shield.regen = itemData.data.recovery.rechargeRate;
        }
      }
    });

    let useArmor = game.settings.get('bunkers-and-badasses', 'usePlayerArmor');
    let usedHps = {};
    Object.entries(context.data.hps).forEach(entry => {
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
    for (let [k, v] of Object.entries(context.data.hps)) {
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
    const spells = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: []
    };
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
      } else if (i.type === 'spell') {
        if (i.data.spellLevel != undefined) {
          spells[i.data.spellLevel].push(i); // Append to spells.
        }
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
    context.spells = spells;
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
    //html.find('.hp-gain-create').click(this._onHpGaindCreate.bind(this));
    html.find('.hp-gain-edit').click(this._onHpGainEdit.bind(this));
    html.find('.hp-gain-delete').click(this._onHpGainDelete.bind(this));

    // Handle XP Gains.
    //html.find('.xp-gain-create').click(this._onXpGainCreate.bind(this));
    html.find('.xp-gain-edit').click(this._onXpGainEdit.bind(this));
    //html.find('.xp-gain-delete').click(this._onXpGainDelete.bind(this));

    // Handle checkbox changes.
    html.find(".checkbox").click(this._onCheckboxClick.bind(this));

    // Display inventory details.
    html.find(".item-dropdown").mousedown(this._expandItemDropdown.bind(this))

    // Handle experience
    html.find('.xp-gain').click(this._onXpGain.bind(this));

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
    var archetypeNum = event.currentTarget.dataset.archetypeNumber;
    var archetypeRewards = this.actor.data.data.archetypes["archetype" + archetypeNum].rewards;

    // Figure out the current archetype highest level.
    var highestLevel = 0;
    archetypeRewards.forEach(archetypeReward => {
      if (archetypeReward.Level > highestLevel) {
        highestLevel = archetypeReward.Level;
      }
    });

    archetypeRewards.push({ Level: highestLevel+1, Description: "" });

    // Square brackets needed to get the right value.
    let archetypeRewardsLabel = "data.archetypes.archetype"+archetypeNum+".rewards";
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

  async _onHpGainEdit(event) {
    event.preventDefault();

    let hp = this.actor.data.data.attributes.hp;

    hp.gains.push({value: 2, description: "level fucking up"});

    let htmlContent = await renderTemplate("systems/bunkers-and-badasses/templates/dialog/hp-gains.html", {
      hpGains: hp.gains,
      deleteOnclick: "context._onHpGainDelete()",
      deletetTwclick: "this._onHpGainDelete",
      thus: this
    });

    this.gainDialog = new Dialog({
      title: "HP Gains",
      Id: "hp-gains-dialog",
      content: htmlContent,
      buttons: {
        "Update" : {
          label : "Update",
          callback : async (html) => {
            alert('update');
            //this._updateArchetypeRewardCallback(html);
          }
        }
      }
    }).render(true);

    html.find('.hp-gain-delete').click(this._onHpGainDelete.bind(this));

  }

  _onHpGainDelete(event) {
    alert('ondel');
  }
  

  async _onXpGainEdit(event) {

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

  async _onXpGain(event) {
    if(this.diag?.rendered)
      return;
    
    event.preventDefault();

    this.createXpGainDialog();
  }

  async _addXpGain(event) {
    return () => {
      alert("addXpGain");
    }
    // var gainsCount = this.actor.data.data.attributes.xp.gains.length;
    // this.actor.data.data.attributes.xp.gains.push({id: gainsCount+1, xp: 20, description: "test"});
    // //$('#xp-gain-dialog').dialog('destroy');
    // this.createXpGainDialog();
  }

  async _deleteXpGain(event) { 

  }

  async createXpGainDialog() {
    var xppo = this.actor.data.data.attributes.xp;
    xppo.gains.push({id: xppo.gains.length+1, value: 0, description: "test"});
    
    let htmlContent = await renderTemplate("systems/bunkers-and-badasses/templates/dialog/xp-gain.html", {
      data: this.actor.data.data, 
      level: this.actor.data.data.attributes.level.value,
      xp: xppo,
      onClickAddXpGain: this._addXpGain.bind(this),
    });

    if (this.diag && !this.diag?.rendered) {
      // consider destroying the old one.
    }
    
    this.diag = new Dialog({
      title: "XP Gain",
      Id: "xp-gain-dialog",
      content: htmlContent,
      buttons: {
        "save" : {
          label : "Save",
          callback : async (html) => { 
            alert("hello"); 
            this.xpGainCallback(html);
          }
        },
        "cancel" : {
            label : "Cancel",
            callback : async () => { 
              alert("hello2");
            }
        }
      }
    }).render(true);
  }  

  async xpGainCallback(html) {
    var levelValue = parseInt(html.find("#level")[0].value);

    var dialogGains = [];

    var gains = html.find("#xp-gain-list");
    var gainkids = gains.children();
    Array.from(gainkids).forEach((child, key) => {
      var xp, desc;
      child.childNodes.forEach((childNode, cnkey) => {
        if (childNode.id) {
          if (childNode.id === "xp-gain-"+(key+1)+"-value") {
            xp = parseInt(childNode.value);
          } else if (childNode.id === "xp-gain-"+(key+1)+"-description") {
            desc = childNode.value;
          }
        }
      }, this);
      dialogGains.push({id: dialogGains.length+1, value: xp, description: desc});
    }, this);

    this.actor.update({"data.attributes.level.value": levelValue, "data.attributes.xp.gains": dialogGains});//{disabled: !effect.data.disabled});
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
      } else if (dataset.rollType == 'check') {
        return this._checkRoll(dataset);
      } else if (dataset.rollType == 'badass') {
        return this._badassRoll(dataset);
      } else if (dataset.rollType == 'health-gain') {
        return this._healthGainRoll(dataset);
      } else if (dataset.rollType == 'health-regain') {
        return this._healthRegainRoll(dataset);
      } else if (dataset.rollType == 'melee-attack') {
        return this._meleeAttackRoll(dataset);
      } else if (dataset.rollType == 'gun-accuracy') {
        return this._gunAccuracyRoll(dataset);
      } /*else if (dataset.rollType == 'gun-damage') {
        return this._gunDamageRoll(dataset);
      }*/ else if (dataset.rollType == 'grenade-throw') {
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
  
  _checkRoll(dataset) {
    // Prep data to access.
    const actorData = this.actor.data.data;
    const check = actorData.checks[dataset.checkType.toLowerCase()];
    if (check.nonRolled) return; // Special case for movement, since I (potentially foolishly) bundled it with checks.
    if (dataset.checkType.toLowerCase() === 'initiative') {
      return this.actor.rollInitiative({createCombatants: true});
    }
    
    const badassRollPiece = check.usesBadassRank ? '+ @badassRank[badass rank]' : ''
    const modRollPiece = `+ @mod[${check.stat} ${actorData.attributes.badassRollsEnabled ? 'stat' : 'mod'}]`;
    const miscRollPiece = `+ @miscBonus[misc bonus]`; 
    // Prepare and roll the check.
    const roll = new Roll(`1d20 ${badassRollPiece} ${modRollPiece} ${miscRollPiece}`, {
      badassRank: actorData.attributes.badassRank,
      mod: check.value,
      miscBonus: check.bonus
    });
    const rollResult = roll.roll();

    // Prep chat values.
    const rollModes = CONFIG.Dice.rollModes;
    // TODO: Create a roll class override for this.
    // const renderedRoll = await rollResult.render({
    //   template: 'systems/bunkers-and-badasses/templates/chat/check-roll.html',
    //   checkType: dataset.checkType,
    //   actorName: this.actor.name,
    // });
    const flavorText = `${this.actor.name} makes a <b>${dataset.checkType}</b> (${check.stat}) check.`;
    const messageData = {
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: flavorText,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: rollResult,
      rollMode: CONFIG.Dice.rollModes.roll,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u._id)
      speaker: ChatMessage.getSpeaker(),
      // content: renderedRoll
    }

    // Send the roll to chat!
    return rollResult.toMessage(messageData);
  }

  _badassRoll(dataset) {

  }

  _healthGainRoll(dataset) {

  }
  
  _healthRegainRoll(dataset) {
    // Prep data to access.
    const actorData = this.actor.data.data;
    const hp = actorData.hps[dataset.healthType.toLowerCase()];
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
    const target = "data.hps." + dataset.healthType.toLowerCase() + ".value";
    this.actor.update({[`${target}`] : newValue});

    // Send the roll to chat!
    return rollResult.toMessage(messageData);
  }

  _meleeAttackRoll(dataset) {

  }

  _gunAccuracyRoll(dataset) {
    
  }

  _grenadeThrowRoll(dataset) {
  }

  async _itemThrowRoll(dataset) {
    return await this._makeCheck(dataset);
  }

  async _makeCheck(dataset) {
    // Prep data to access.
    const actorData = this.actor.data.data;

    const throwCheck = {
      stat: "acc",
      value: 1,
      bonus: 2,
      total: 3,
      usesBadassRank: false,
    }

    const dialogHtmlContent = await renderTemplate("systems/bunkers-and-badasses/templates/dialog/check-difficulty.html", {
      attributes: actorData.attributes,
      check: throwCheck,
      defaultDifficulty: 12
    });

    this.check = new Dialog({
      title: "Throw Item",
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
            return await this._rollCheck(html);
          }
        }
      }
    }).render(true);
  }

  async _rollCheck(html) {
    // Prep data to access.
    const actorData = this.actor.data.data;
    const accuracyStat = actorData.stats.acc;

    // Pull data from html.
    const extraBonusValue = parseInt(html.find("#extra")[0].value);
    const difficultyValue = parseInt(html.find("#difficulty")[0].value);            
    const difficultyEntered = !isNaN(difficultyValue);

    // Prepare and roll the check.
    const rollStatMod = ` + @accuracy[acc ${actorData.attributes.badassRollsEnabled ? 'stat' : 'mod'}]`;
    const rollMiscMod = '';
    const rollBonusMod = (isNaN(extraBonusValue) || extraBonusValue == 0 ? '' : ` + @extraBonus[extra bonus]`);
    const rollDifficulty = ((difficultyValue != null && !isNaN(difficulty)) ?
      `cs>=${difficultyValue}` :
      ``);

    const roll = new Roll(`1d20${rollStatMod}${rollMiscMod}${rollBonusMod}${rollDifficulty}`, {
      accuracy: accuracyStat.value,
      extraBonus: extraBonusValue,
    });
    const rollResult = roll.roll();

    return await this._displayCheckRollResultToChat({ 
      rollResult: rollResult, 
      difficultyValue: difficultyValue, 
      difficultyEntered: difficultyEntered });
  }

  async _displayCheckRollResultToChat(objs) {
    // Pull values from objs.
    const rollResult = objs.rollResult;
    const difficultyValue = objs.difficultyValue;
    const difficultyEntered = objs.difficultyEntered;

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

}
