/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class BNBItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
  }

  /**
   * Prepare a data object which is passed to any Roll formulas which are created related to this Item
   * @private
   */
   getRollData() {
    // If present, return the actor's roll data.
    if ( !this.actor ) return null;
    const rollData = this.actor.getRollData();
    rollData.item = foundry.utils.deepClone(this.data.data);

    return rollData;
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll() {
    const item = this.data;

    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const label = `[${item.type}] ${item.name}`;

    // If there's no roll data, send a chat message.
    if (!this.data.data.formula) {
      ChatMessage.create({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
        content: item.data.description ?? ''
      });
    }
    // Otherwise, create a roll and send a chat message from it.
    else {
      // Retrieve roll data.
      const rollData = this.getRollData();

      // Invoke the roll and submit it to chat.
      const roll = await new Roll(rollData.item.formula, rollData).roll();
      roll.toMessage({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
      });
      return roll;
    }
  }


  /**
   * Apply listeners to chat messages.
   * @param {HTML} html  Rendered chat message.
   */
  static addChatListeners(html) {
    html.on('click', '.chat-damage-buttons button', this._onChatCardDamage.bind(this));
    //html.on('click', '.item-name', this._onChatCardToggleContent.bind(this));
  }

  static async _onChatCardDamage(event) {
    event.preventDefault();

    const dataSet = event.currentTarget.dataset;
    const actor = game.actors.get(dataSet.actorId);
    if (actor === null) return;
    const actorData = actor.data.data;
    const item = actor.items.get(dataSet.itemId);
    const itemData = item.data.data;

    const hits = dataSet.hits;
    const crits = dataSet.crits;

    let rollFormula = '';
    Object.entries(itemData.elements).forEach(([key, elementData]) => {
      if(elementData.enabled) {
        if (isNaN(hits)) {
          rollFormula+=`(${elementData.damage})[${elementData.label}] +`;
        } else {
          for (let i = 0; i < hits; i++) {
            rollFormula+=`(${elementData.damage})[${elementData.label}] +`;
          }
        }
      }
    });
    rollFormula = rollFormula.slice(0, -1);
    // if (actorData?.bonus?.shooting?.dmg) {
    //   rollFormula += `+ @shootdmgeffects[Dmg Effects]`
    // } else {
    //   rollFormula = rollFormula.slice(0, -1);
    // }
    if (!isNaN(crits)) {
      rollFormula += `+ ${crits}d12[Crit]`
      // if (actorData?.bonus?.shooting?.dmg) {
      //   rollFormula += `+ @shootcritdmgeffects[Crit Effects]`
      // }
    }

    
    // Prepare and roll the damage.
    const roll = new Roll(rollFormula, {
      actor: actor,
    });
    const rollResult = await roll.roll();
    
    // Convert roll to a results object for sheet display.
    const rollResults = {};
    rollResult.terms.forEach((term, key) => {
      if (term instanceof DiceTerm || term instanceof NumericTerm) {
        if (rollResults[term.options.flavor] == null) {
          rollResults[term.options.flavor] = {
            formula: "Rolled",
            total: 0,
          };
        }
        rollResults[term.options.flavor].formula += ` ${term.expression} +`;
        rollResults[term.options.flavor].total += term.total;
      }
    });
    Object.entries(rollResults).forEach((entry, key) => {
      entry[1].formula = entry[1].formula.slice(0, -1);
    });

    const additionalDamage = 
      (actorData.favored[itemData.type?.value] ? actorData.stats.dmg.modToUse : 0) +
      (itemData.statMods?.dmg ?? 0) +
      ( // SPECIAL special logic for a unique legendary.
        (itemData.special?.overrideType?.toLowerCase() === 'mwbg') 
        ? (actorData.stats.mst.modToUse + (itemData.statMods?.mst ?? 0)) : 0
      ) +
      (actorData?.bonus?.combat?.shooting?.dmg ?? 0) +
      ((!isNaN(crits) && crits > 0) ? (actorData?.bonus?.combat?.shooting?.critdmg ?? 0) : 0);
    const templateLocation = 'systems/bunkers-and-badasses/templates/chat/damage-results.html';
    const chatHtmlContent = await renderTemplate(templateLocation, {
      results: rollResults,
      showAdditionalDamage: additionalDamage != 0,
      additionalDamage: additionalDamage,
      uniformElement: "Kinetic" // TODO use this to color code stuff if only one element type was used
    });

    // Prep chat values.
    const flavorText = `<b>${item.name}</b> goes <i>"${dataSet.flavor}"</i>`;
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: flavorText,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: rollResult,
      rollMode: CONFIG.Dice.rollModes.publicroll,
      content: chatHtmlContent,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u.id)
      speaker: ChatMessage.getSpeaker(),
    }


    return rollResult.toMessage(messageData);
  }
}