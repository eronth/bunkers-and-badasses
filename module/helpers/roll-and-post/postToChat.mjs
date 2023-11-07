import { genericUtil } from "../genericUtil.mjs";

export class PostToChat {

  static async damageResistance(options) {
    const { actor, rollResult, reductionAmount, damageType } = options;

    const label = `${actor.name} resists <span class='${damageType}-text bolded'>`
      + `${reductionAmount} ${damageType}` 
      + `</span> damage.`;

    if (rollResult.isFakeRollResult) return;

    rollResult.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: label,
      rollMode: game.settings.get('core', 'rollMode'),
    });
  }

  static async damageTaken(options) {
    const { actor, rollResult, damageAmount, damageTaken, damageType } = options;

    const damageLossesText = [];

    Object.entries(damageTaken).forEach(([healthType, healthLoss]) => {
      if (healthLoss > 0) {
        const healthTypeText = genericUtil.capitalize(genericUtil.healthTypeToText(healthType));
        damageLossesText.push(`<span class='${healthType}-text bolded'>${healthLoss} ${healthTypeText}</span>`);
      }
    });

    const formatter = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });
    const label = `${actor.name} takes <span class='${damageType}-text bolded'>${damageAmount} ${damageType}</span> damage. `
      + `They lose ${ (damageLossesText.length > 0) ? formatter.format(damageLossesText) : 'no health'}.`;

    rollResult.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: label,
      rollMode: game.settings.get('core', 'rollMode'),
    });
  }

  static async skillCheck(options) {
    const { actor, checkDetails, rollResult } = options;
    const difficultyValue = checkDetails.difficultyValue;
    const checkType = checkDetails.checkType;

    const templateLocation = 'systems/bunkers-and-badasses/templates/chat/check-roll.html';
    const chatHtmlContent = await renderTemplate(templateLocation, {
      actorId: actor.id,
      diceRoll: `Rolled ${rollResult.formula}.`,
      result: rollResult.result,
      total: rollResult.total,
      difficulty: difficultyValue,
      attackType: 'check',
      success: (difficultyValue != null) && rollResult.total >= difficultyValue,
      failure: (difficultyValue != null) && rollResult.total < difficultyValue,
    });

    // Prep chat values.
    const checkSubTypeText = ((checkType?.sub ?? '') != '') ? ` (${checkType?.sub})` : '';
    const flavorText = (checkType?.skill === 'throw') ? `${actor.name} attempts to throw an item.` : `${actor.name} attempts a ${checkType?.super}${checkSubTypeText} check.`;
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

    // Send the roll to chat!
    return rollResult.toMessage(messageData);
  }

  static async grenadeThrow(options) {
    const { actor, itemId, checkDetails, rollResult } = options;
    const item = actor.items.get(itemId);
    const difficultyValue = checkDetails.difficultyValue;

    const templateLocation = 'systems/bunkers-and-badasses/templates/chat/check-roll.html';
    const chatHtmlContent = await renderTemplate(templateLocation, {
      actorId: actor.id,
      itemId: item.id,
      diceRoll: `Rolled ${rollResult.formula}.`,
      result: rollResult.result,
      total: rollResult.total,
      difficulty: difficultyValue,
      redText: item.system.redText,
      attackType: 'grenade',
      showDamageButton: true,
      success: (difficultyValue != null) && rollResult.total >= difficultyValue,
      failure: (difficultyValue != null) && rollResult.total < difficultyValue,
    });

    // Prep chat values.
    const flavorText = `${actor.name} attempts to throw a grenade.`;
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
    
    // Send the roll to chat!
    const ret = await rollResult.toMessage(messageData);
    // TODO fix this shit this._handleRedText(item);
    return ret;
  }

}