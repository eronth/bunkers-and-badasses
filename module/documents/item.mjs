import { genericUtil } from "../helpers/genericUtil.mjs";

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
    rollData.item = foundry.utils.deepClone(this.system);

    return rollData;
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll() {
    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const label = `[${this.type}] ${this.name}`;

    // If there's no roll data, send a chat message.
    if (!this.system.formula) {
      ChatMessage.create({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
        content: this.system.description ?? ''
      });
    }
    // Otherwise, create a roll and send a chat message from it.
    else {
      // Retrieve roll data.
      const rollData = this.getRollData();

      // Invoke the roll and submit it to chat.
      const roll = await new Roll(rollData.item.formula, rollData).roll({async: true});
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
    const actorSystem = actor.system;
    const item = actor.items.get(dataSet.itemId);
    const itemSystem = item.system;

    const hits = dataSet.hits;
    const crits = dataSet.crits;

    const archetypeBonusDamages = actorSystem?.archetypeLevelBonusTotals?.bonusDamage;

    // Prepare the roll formula.
    let rollFormula = '';
    const evb = this.extractArchetypeBonusDamage(item, {
      archetypeBonusDamages: archetypeBonusDamages,
      attackType: dataSet.attackType,
      hits: hits, crits: crits,
      nat20: dataSet.critHit,
    });

    // Add in the per hit data.)
    Object.entries(itemSystem.elements).forEach(([key, element]) => {
      if (element.enabled) {
        for (let i = 0; i < (hits ?? 1); i++) {
          const damageText = element.damage 
            + (evb.perHit ? ` + ${evb.perHit}` : '');
          rollFormula+=`(${damageText})[${genericUtil.capitalize(key)}] +`;
        }
      }
    });
    
    
    // Add in the per attack data.
    if (itemSystem.bonusElements) {
      Object.entries(itemSystem.bonusElements).forEach(([key, element]) => {
        if (element.enabled) {
          const damageText = element.damage
            + (evb.perAttack ? ` + ${evb.perAttack}` : '');
          rollFormula += `(${damageText})[${genericUtil.capitalize(key)}] + `;
        }
      });
    }

    if (!isNaN(crits) && crits > 0) {
      const damageText = `${crits}d12`
        + (evb.perCrit ? ` + ${(evb.perCrit * crits)}` : '');
      const anyCritText = (crits ? ` + ${(archetypeBonusDamages?.ifAnyCrit ?? 0)}` : '');
      rollFormula += ` (${damageText}${anyCritText})[Crit]`;
    }

    if (rollFormula === '') {
      ui.notifications.warn('No damage to roll.');
      rollFormula = '0[Kinetic]';
    }
    
    // Prepare and roll the damage.
    const roll = new Roll(rollFormula, {
      actor: actor,
    });
    const rollResult = await roll.roll({async: true});
    
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

    let additionalDamage = (0
      + (actorSystem.favored[itemSystem.type?.value] ? actorSystem.stats.dmg.modToUse : 0)
      + (itemSystem.statMods?.dmg ?? 0)
      + ( // SPECIAL special logic for a unique legendary.
          (itemSystem.special?.overrideType?.toLowerCase() === 'mwbg') 
          ? (actorSystem.stats.mst.modToUse + (itemSystem.statMods?.mst ?? 0)) : 0
        )
      + (actorSystem?.bonus?.combat?.shooting?.dmg ?? 0) + (actorSystem?.bonus?.combat?.attack?.dmg ?? 0)
      + ((!isNaN(crits) && crits > 0) 
          ? ((actorSystem?.bonus?.combat?.shooting?.critdmg ?? 0)
            + (actorSystem?.bonus?.combat?.attack?.critdmg ?? 0))
          : 0)
      // All extra damage from level up bonuses.
      + (evb.extra)
    );
      
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

  static extractArchetypeBonusDamage(item, inputData) {
    const { archetypeBonusDamages, hits, crits, attackType, nat20 } = inputData;
    const itemSystem = item.system;

    /// Setup
    const evaluatedBonusDamages = {
      perHit: 0,
      perCrit: 0,
      perAttack: 0,
      extra: 0,
    };

    const onePerAttackDamages = (0
      + (archetypeBonusDamages?.anyAttack ?? 0)
      + ((attackType === 'shooting') ? (archetypeBonusDamages?.shootingAttack ?? 0) : 0)
      + ((attackType === 'melee') ? (archetypeBonusDamages?.meleeAttack ?? 0) : 0)
      + ((attackType === 'grenade') ? (archetypeBonusDamages?.grenade ?? 0) : 0)
      + (nat20 ? (archetypeBonusDamages?.onNat20 ?? 0) : 0)
    );
    let alreadyAddedPerAttack = false;

    const hitsDamageTypeSet = new Set();
    const attackBonusDamageTypeSet = new Set();
    const damageTypeSet = new Set();
    let isNonElemental = false;
    let isElemental = false;
    if (itemSystem.elements) {
      Object.entries(itemSystem.elements).forEach(([key, element]) => {
        if (element.enabled) {
          if (key === 'kinetic') isNonElemental = true;
          else isElemental = true;
          hitsDamageTypeSet.add(key);
          damageTypeSet.add(key);
        }
      });
    }
    if (itemSystem.bonusElements) {
      Object.entries(itemSystem.bonusElements).forEach(([key, element]) => {
        if (element.enabled) {
          if (key === 'kinetic') isNonElemental = true;
          else isElemental = true;
          attackBonusDamageTypeSet.add(key);
          damageTypeSet.add(key);
        }
      });
    }

    /// Evaluate

    if (hitsDamageTypeSet.size > 1 && hits) {
      evaluatedBonusDamages.extra += ((hits ?? 0) * (archetypeBonusDamages?.perHit ?? 0));
    } else if (hitsDamageTypeSet.size === 1) {
      evaluatedBonusDamages.perHit += (archetypeBonusDamages?.perHit ?? 0);
    }

    if ((crits ?? 0) > 0) {
      evaluatedBonusDamages.perCrit += (archetypeBonusDamages?.perCrit ?? 0);
    }

    // add to per attack.
    if (!alreadyAddedPerAttack && attackBonusDamageTypeSet.size === 1) {
      evaluatedBonusDamages.perAttack += onePerAttackDamages;
      alreadyAddedPerAttack = true;
    }

    // add to per hit
    if (!alreadyAddedPerAttack
      && (hits === 1 || attackType === 'grenade')
      && hitsDamageTypeSet.size === 1) {
      evaluatedBonusDamages.perHit += onePerAttackDamages;
      alreadyAddedPerAttack = true;
    }


    // add element and non element bonuses
    evaluatedBonusDamages.extra += (isNonElemental) ? (archetypeBonusDamages?.elements?.kinetic ?? 0) : 0;
    evaluatedBonusDamages.extra += (isElemental) ? (archetypeBonusDamages?.elements?.other ?? 0) : 0;

    
    // If we haven't ended up adding this value yet, time to add it!
    if (!alreadyAddedPerAttack) {
      evaluatedBonusDamages.extra += onePerAttackDamages;
      alreadyAddedPerAttack = true;
    }    
  
    /// Return

    return evaluatedBonusDamages;
  }
}