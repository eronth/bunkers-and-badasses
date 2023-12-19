import { genericUtil } from "../genericUtil.mjs";

export class PostToChat {
  static chatInfoBaseLocation = 'systems/bunkers-and-badasses/templates/chat/info/';

  static async badassRoll(options) {
    const { actor, checkDetails, rollResult } = options;
    //const difficultyValue = checkDetails.difficultyValue;

    const templateLocation = 'systems/bunkers-and-badasses/templates/chat/badass-result.html';
    const chatHtmlContent = await renderTemplate(templateLocation, {
      badassDiceResult: checkDetails.badassDiceResult,
      total: checkDetails.total,
      overallRollFormula: checkDetails.overallRollFormula,
    });
    

    // Prep chat values.
    const flavorText = `${actor.name} attempts a <i class="fas fa-skull"></i><b>Badass Maneuver</b>!`;
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: flavorText,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: rollResult,
      rollMode: CONFIG.Dice.rollModes.publicroll,
      content: chatHtmlContent,
      checkDetails: checkDetails,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u.id)
      speaker: ChatMessage.getSpeaker(),
    }
    
    // Send the roll to chat!
    const ret = await rollResult.toMessage(messageData);
    return ret;
  }

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
    const checkTypeText = checkType.super + ((checkType.sub) ? ` (${checkType.sub})` : '');

    const templateLocation = 'systems/bunkers-and-badasses/templates/chat/check-roll.html';
    const chatHtmlContent = await renderTemplate(templateLocation, {
      actorId: actor.id,
      overallRollFormula: rollResult.formula,
      diceRolled: '1d20',
      diceResult: rollResult.dice[0].results[0].result,
      checkType: checkTypeText,
      total: rollResult.total,
      difficulty: difficultyValue,
      attackType: 'check',
      success: (difficultyValue != null) && rollResult.total >= difficultyValue,
      failure: (difficultyValue != null) && rollResult.total < difficultyValue,
    });

    // Prep chat values.
    const flavorText = (checkType?.skill === 'throw') ? `${actor.name} attempts to throw an item.` : `${actor.name} attempts a ${checkTypeText} check.`;
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
      // actorId: actor.id,
      actorId: actor.id,
      itemId: item.id,
      overallRollFormula: rollResult.formula,
      // diceRolled: '1d20',
      diceRolled: '1d20',
      // diceResult: rollResult.dice[0].results[0].result,
      diceResult: rollResult.dice[0].results[0].result,
      // checkType: checkTypeText,
      checkType: 'Grenade Toss',
      // total: rollResult.total,
      total: rollResult.total,
      // difficulty: difficultyValue,
      difficulty: difficultyValue,
      redText: item.system.redText,
      // attackType: 'check',
      attackType: 'grenade',
      showDamageButton: true,
      // success: (difficultyValue != null) && rollResult.total >= difficultyValue,
      success: (difficultyValue != null) && rollResult.total >= difficultyValue,
      // failure: (difficultyValue != null) && rollResult.total < difficultyValue,
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

  static async itemInfo(options) {
    const actor = options.actor;
    const item = options.item;

    // Pull message details for specific item type.
    const messageDetailOptions = {
      item: item,
      renderTemplateConfig: {
        actorId: actor.id,
        description: item.system.description,
        item: item
      }
    };
    let messageDetail = await this.getItemPostMessageDetail(messageDetailOptions);

    // Compile message data for chatbox.
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      type: CONST.CHAT_MESSAGE_TYPES.IC,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u.id)
      speaker: ChatMessage.getSpeaker(),
      ...messageDetail
    };

    // Send the roll to chat!
    return ChatMessage.create(messageData);
  }

  static async getItemPostMessageDetail(options) {
    const item = options.item;
    const itemType = item.type.toLowerCase();
    switch (itemType) {
      case 'gun':
        return await this.getGunPostDetail(options);
      case 'shield':
      case 'shield mod':
      case 'shieldmod':
        return await this.getShieldPostDetail(options);
      case 'grenade':
      case 'grenade mod':
      case 'grenademod':
        return await this.getGrenadePostDetail(options);
      case 'relic':
        return await this.getRelicPostDetail(options);
      case 'potion':
        return await this.getPotionPostDetail(options);
      case 'key':
      case 'keyitem':
      case 'key item':
        return await this.getKeyItemPostDetail(options);
      case 'archetype feat':
      case 'archetypefeat':
        return await this.getArchetypeFeatPostDetail(options);
      case 'actionskill':
      case 'action skill':
        return await this.getActionSkillPostDetail(options);
      case 'skill':
        return await this.getSkillPostDetail(options);
      default:
    }
  }

  static async getGunPostDetail(options) {
    // Pull base objects.
    const templateLocation = `${this.chatInfoBaseLocation}gun-info.html`;
    const renderTemplateConfig = options.renderTemplateConfig;
    const item = renderTemplateConfig.item;

    // Create chat info data.
    renderTemplateConfig.damagePerHitHtml = genericUtil.createGunDamagePerHitHtml({elements: item.system.elements});
    if (renderTemplateConfig.damagePerHitHtml) {
      renderTemplateConfig.damagePerHitHtml += `<label class="element-damage-plus"> Damage</label>`;
    }
    renderTemplateConfig.damagePerAttackHtml = genericUtil.createGunBonusDamageHtml({elements: item.system.bonusElements});
    if (renderTemplateConfig.damagePerAttackHtml) {
      renderTemplateConfig.damagePerAttackHtml += `<label class="element-damage-plus"> Damage</label>`;
    }
    const chatHtmlContent = await renderTemplate(templateLocation, renderTemplateConfig);
    const flavorPrefix = item.system.prefix.name ? `${item.system.prefix.name} ` : '';
    const levelAndGuild = `Level ${item.system.level} ${item.system.guild}`;
    
    // Create additional message details object.
    return {
      flavor: `<div class="flavor-text-wrapper"><div class="flavor-text-inner">${flavorPrefix}<b>${item.name}</b> ${item.system.type.name}</div><div class="level-and-guild">${levelAndGuild}</div></div>`,
      content: chatHtmlContent
    }
  }

  static async getShieldPostDetail(options) {
    // Pull base objects.
    const templateLocation = `${this.chatInfoBaseLocation}shield-info.html`;
    const renderTemplateConfig = options.renderTemplateConfig;
    const item = renderTemplateConfig.item;

    // Create chat info data.
    const capHealthType = genericUtil.capitalize(genericUtil.healthTypeToText(item.system.healthType));
    renderTemplateConfig.healthType = capHealthType;
    renderTemplateConfig.resistHtml = genericUtil.createFullShieldResistHtml({elements: item.system.elements});
    const chatHtmlContent = await renderTemplate(templateLocation, renderTemplateConfig);
    const levelAndGuild = `Level ${item.system.level} ${item.system.guild}`;
    
    // Create additional message details object.
    return {
      flavor: `<div class="flexrow"><div><b>${item.name}</b> ${capHealthType} Protection.</div><div class="level-and-guild">${levelAndGuild}</div></div>`,
      content: chatHtmlContent
    }
  }

  static async getGrenadePostDetail(options) {
    // Pull base objects.
    const templateLocation = `${this.chatInfoBaseLocation}grenade-info.html`;
    const renderTemplateConfig = options.renderTemplateConfig;
    const item = renderTemplateConfig.item;

    // Create chat info data.
    renderTemplateConfig.damageHtml = genericUtil.createGrenadeDamageHtml({elements: item.system.elements});
    const chatHtmlContent = await renderTemplate(templateLocation, renderTemplateConfig);
    const levelAndGuild = `Level ${item.system.level} ${item.system.guild}`;
    
    // Create additional message details object.
    return {
      flavor: `<div class="flexrow"><div><b>${item.name}</b> Grenade.</div><div class="level-and-guild">${levelAndGuild}</div></div>`,
      content: chatHtmlContent
    }
  }

  static async getRelicPostDetail(options) {
    // Pull base objects.
    const templateLocation = `${this.chatInfoBaseLocation}relic-info.html`;
    const renderTemplateConfig = options.renderTemplateConfig;
    const item = renderTemplateConfig.item;
    
    // Create chat info data.
    const chatHtmlContent = await renderTemplate(templateLocation, renderTemplateConfig);
    
    // Create additional message details object.
    return {
      flavor: `Relic <b>${item.name}</b>.`,
      content: chatHtmlContent
    }
  }

  static async getPotionPostDetail(options) {
    // Pull base objects.
    const templateLocation = `${this.chatInfoBaseLocation}potion-info.html`;
    const renderTemplateConfig = options.renderTemplateConfig;
    const item = renderTemplateConfig.item;
    
    // Create chat info data.
    const chatHtmlContent = await renderTemplate(templateLocation, renderTemplateConfig);
    
    // Create additional message details object.
    return {
      flavor: `Potion <b>${item.name}</b>.`,
      content: chatHtmlContent
    }
  }

  static async getKeyItemPostDetail(options) {
    // Pull base objects.
    const templateLocation = `${this.chatInfoBaseLocation}key-item-info.html`;
    const renderTemplateConfig = options.renderTemplateConfig;
    const item = renderTemplateConfig.item;

    // Create chat info data.
    const chatHtmlContent = await renderTemplate(templateLocation, renderTemplateConfig);
    
    // Create additional message details object.
    return {
      flavor: `Key Item <b>${item.name}</b>.`,
      content: chatHtmlContent
    }
  }

  static async getArchetypeFeatPostDetail(options) {
    // Pull base objects.
    const templateLocation = `${this.chatInfoBaseLocation}archetype-feat-info.html`;
    const renderTemplateConfig = options.renderTemplateConfig;
    const item = renderTemplateConfig.item;

    // Create chat info data.
    const chatHtmlContent = await renderTemplate(templateLocation, renderTemplateConfig);
    
    // Create additional message details object.
    return {
      flavor: `Archetype Feat <b>${item.name}</b>.`,
      content: chatHtmlContent
    }
  }

  static async getActionSkillPostDetail(options) {
    // Pull base objects.
    const templateLocation = `${this.chatInfoBaseLocation}action-skill-info.html`;
    const renderTemplateConfig = options.renderTemplateConfig;
    const item = renderTemplateConfig.item;

    // Create chat info data.
    const chatHtmlContent = await renderTemplate(templateLocation, renderTemplateConfig);
    
    // Create additional message details object.
    return {
      flavor: `Action Skill <b>${item.name}</b>.`,
      content: chatHtmlContent
    }
  }

  static async getSkillPostDetail(options) {
    // Pull base objects.
    const templateLocation = `${this.chatInfoBaseLocation}class-skill-info.html`;
    const renderTemplateConfig = options.renderTemplateConfig;
    const item = renderTemplateConfig.item;

    // Create chat info data.
    const chatHtmlContent = await renderTemplate(templateLocation, renderTemplateConfig);
    
    // Create additional message details object.
    return {
      flavor: `Class Skill <b>${item.name}</b>.`,
      content: chatHtmlContent
    }
  }
}