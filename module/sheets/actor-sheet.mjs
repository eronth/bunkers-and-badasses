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
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "features" },
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
    // Handle ability scores.
    for (let [k, v] of Object.entries(context.data.abilities)) {
      v.label = game.i18n.localize(CONFIG.BNB.abilities[k]) ?? k;
    }

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
      } 
      // else if (i.type === 'Archetype Level') {
      //   archetypeLevels.push(i); // Append to archetype Levels.
      // } 
      else if (i.type === 'Archetype Feat') {
        archetypeFeats.push(i); // Append to archetype Feats.
      } else if (i.type === 'Class Skill') {
        classSkills.push(i); // Append to class Skills.
      }
    }

    // Assign and return
    context.gear = gear;
    context.features = features;
    context.spells = spells;
    //context.archetypeLevels = archetypeLevels;
    context.archetypeFeats = archetypeFeats;
    context.classSkills = classSkills;
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

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
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


    //this.actor.data.data.attributes.level.value = levelValue;
    // this.actor.data.data.attributes.xp.gains.length = 0;
    // this.actor.data.data.attributes.xp.gains.push(...dialogGains);

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
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
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

}
