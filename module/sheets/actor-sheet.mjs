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
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "features" }]
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
    const archetypeLevels = [];
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
      } else if (i.type === 'Archetype Level') {
        archetypeLevels.push(i); // Append to archetype Levels.
      } else if (i.type === 'Archetype Feat') {
        archetypeFeats.push(i); // Append to archetype Feats.
      } else if (i.type === 'Class Skill') {
        classSkills.push(i); // Append to class Skills.
      }
    }

    // Assign and return
    context.gear = gear;
    context.features = features;
    context.spells = spells;
    context.archetypeLevels = archetypeLevels;
    context.archetypeFeats = archetypeFeats;
    context.classSkills = classSkills;
   }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));
    html.find('.xp-gain').click(this._onXpGain.bind(this));

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

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
