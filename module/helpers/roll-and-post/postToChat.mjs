import { genericUtil } from "../genericUtil.mjs";

export class PostToChat {

  static async damageResistance(options) {
    const { actor, rollResult, reductionAmount, damageType } = options;

    const label = `${actor.name} resists <span class='${damageType}-text bolded'>`
      + `${reductionAmount} ${damageType}` 
      + `</span> damage.`;

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

}