/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class BNBItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["bunkers-and-badasses", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  /** @override */
  get template() {
    const path = "systems/bunkers-and-badasses/templates/item";
    // Return a single sheet for all item types.
    // return `${path}/item-sheet.html`;

    // Alternatively, you could use the following return statement to do a
    // unique item sheet by type, like `weapon-sheet.html`.
    return `${path}/item-${this.item.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData(options) {
    // Retrieve base data structure.
    const context = await super.getData(options);

    // Use a safe clone of the item data for further operations.
    const itemData = context.item;
    
    // Get updates from previous versions.
    this.updateDataFromPreviousVersions(itemData);
    
    // Prep enriched text portions for better text display.
    await this.prepareEnrichedFields(context, itemData);

    // Not 100% what this even means!!
    // Retrieve the roll data for TinyMCE editors.
    context.rollData = {};
    let actor = this.object?.parent ?? null;
    if (actor) {
      context.rollData = actor.getRollData();
    }

    // Prep some flags for display.
    context.usePlayerArmor = game.settings.get('bunkers-and-badasses', 'usePlayerArmor');
    context.usePlayerBone = game.settings.get('bunkers-and-badasses', 'usePlayerBone');
    context.usePlayerEridian = game.settings.get('bunkers-and-badasses', 'usePlayerEridian');

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = itemData.system;
    context.flags = itemData.flags;
    context.elements = itemData.system.elements;

    // Special handling for uniques.
    if (itemData.system.special?.overrideType?.toLowerCase() === "mwbg") {
      context.isMasterworkBladegun = true;
    } else if (itemData.system.special?.overrideType?.toLowerCase() === "solarflare") {
      context.isSolarFlare = true;
    }  

    context.showRedTextMeaning = game.user.isGM;

    return context;
  }

  updateDataFromPreviousVersions(item) {
    if (item.type == "shield") {
      if (item.system.healthType == null) {
        item.healthType = (item.isArmor) ? 'armor' : 'shield';
        const targetKey = 'system.healthType';
        this.item.update({ [targetKey]: item.system.healthType });
  
        item.system.recoveryRate = (item.system.isArmor) ? item.system.repairRate : item.system.rechargeRate;
        const targetKey2 = 'system.recoveryRate';
        this.item.update({ [targetKey2]: item.system.recoveryRate });
  
        item.system.isArmor = null;
        const removeArmorKey = 'system.-=isArmor';
        this.item.update({ [removeArmorKey]: null });
      }
    }
  }

  async prepareEnrichedFields(context, item) {
    const system = this.object.system;
    const configs = {async: true};
    let extraEnrichments = {};

    if (item.type == "Action Skill") {
      extraEnrichments = {
        notes: await TextEditor.enrichHTML(system.notes, configs),
      };
    }

    context.enriched = {
      description: await TextEditor.enrichHTML(system.description, configs),
      redTextEffect: await TextEditor.enrichHTML(system.redTextEffect, configs),
      redTextEffectBM: await TextEditor.enrichHTML(system.redTextEffectBM, configs),
      ...extraEnrichments
    };
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Roll handlers, click handlers, etc. would go here.
    html.find('.rarity-option-dropdown').click(this._onRarityOptionDropdownClick.bind(this));
    html.find('.rarity-option').click(this._onRarityOptionClick.bind(this));
    html.find('.gun-type-option-dropdown').click(this._onGunTypeOptionDropdownClick.bind(this));
    html.find('.type-option').click(this._onGunTypeOptionClick.bind(this));
    html.find('.health-type-option-dropdown').click(this._onHealthTypeOptionDropdownClick.bind(this));
    html.find('.health-type-option').click(this._onHealthTypeOptionClick.bind(this));
    html.find('.damage-entry').click(this._onDamageEntryClick.bind(this));
    html.find('.checkbox').click(this._onCheckboxToggleClick.bind(this));
  }

  _onRarityOptionDropdownClick(event) {
    $(event.currentTarget).closest("ul").children('li:not(.init)').toggle();
  }

  _onRarityOptionClick(event) {
    let allOptions = $("ul").children('.rarity-option');
    allOptions.removeClass('selected');

    $(event.currentTarget).addClass('selected');
    $("ul").children(`.rarity-init-${this.item.id}`).html($(event.currentTarget).html());
  
    let newRarity = $(event.currentTarget).attr("value");
    // $("#rarity-selection-tracker").attr("value", $(this).attr("value"));
    //     allOptions.toggle();
    // });
    let newRarityObj = {"name": newRarity, "value": newRarity.toLowerCase(), "colorValue": this._getColorsForRarity(newRarity)};
    this.item.update({"system.rarity": newRarityObj});
  }

  _onGunTypeOptionDropdownClick(event) {
    $(event.currentTarget).closest("ul").children('li:not(.init)').toggle();
  }

  _onGunTypeOptionClick(event) {
    const allOptions = $("ul").children('.type-option');
    allOptions.removeClass('selected');

    $(event.currentTarget).addClass('selected');
    $("ul").children(`.type-init-${this.item.id}`).html($(event.currentTarget).html());
    const fullName = event.currentTarget.innerHTML;
  
    const newGunType = $(event.currentTarget).attr("value");
    this.item.update({"system.type": { name: fullName, value: newGunType } });
  }

  _onHealthTypeOptionDropdownClick(event) {
    $(event.currentTarget).closest("ul").children('li:not(.init)').toggle();
  }

  _onHealthTypeOptionClick(event) {
    const allOptions = $("ul").children('.health-type-option');
    allOptions.removeClass('selected');

    $(event.currentTarget).addClass('selected');
    $("ul").children(`.health-type-init-${this.item.id}`).html($(event.currentTarget).html());

    const newHealthType = $(event.currentTarget).attr("value");
    this.item.update({"system.healthType": newHealthType});
  }


  // Healper function
  _getColorsForRarity(rarity) {
    const rarityLC = rarity.toLowerCase();
    switch(rarityLC) {
      case "common":
        return "#a5a49f";
        break;
      case "uncommon":
        return "#0ea11f";
        break;
      case "rare":
        return "#00a0ff";
        break;
      case "epic":
        return "#7000a4";
        break;
      case "legendary":
        return "#ffa500";
        break;
      default:
        return "#FFFFFF";
        break;
    }
  }

  async _onDamageEntryClick(event) {
    event.preventDefault();

    const templateLocation = 'systems/bunkers-and-badasses/templates/item/parts/damage-entry.html';
    let htmlContent = await renderTemplate(templateLocation, {
        elements: this.item.system.elements,
      });

    this.elemDiag = new Dialog({
      title: "Damage and Elements",
      Id: "damage-entry-dialog",
      content: htmlContent,
      buttons: {
        "Update" : {
          label : "Update",
          callback : async (html) => { this._updateArchetypeRewardCallback(html);}
        },
        "Cancel" : {
          label : "Cancel",
          callback : async (html) => { /* do nothing */ }
        }
      }
    }).render(true);
  }

  _onCheckboxToggleClick(event) {
    const targetKey = $(event.currentTarget).attr("data-item-target");
    const currentValue = getProperty(this.item, targetKey);
    return this.item.update({ [targetKey]: !currentValue });
  }

}