import { DamageDiceRollDataExtractHelper } from "../damageDiceRollDataExtractHelper.mjs";
import { genericUtil } from "../genericUtil.mjs";
import { Enricher } from "../enricher.mjs";

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
      //type: CONST.CHAT_MESSAGE_STYLES.ROLL,
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
    const checkTypeText = checkType.super + ((checkType.sub) ? ` (${checkType.sub})` : '') + ' Check';

    const parts = rollResult.dice.map(d => d.getTooltipData());
    parts[0].flavor = checkTypeText;
    
    const templateLocation = 'systems/bunkers-and-badasses/templates/chat/check-roll.html';
    const chatHtmlContent = await renderTemplate(templateLocation, {
      actorId: actor.id,
      checkType: checkTypeText,
      overallRollFormula: rollResult.formula,
      parts: parts,
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
      //type: CONST.CHAT_MESSAGE_STYLES.ROLL,
      roll: rollResult,
      rollMode: CONFIG.Dice.rollModes.publicroll,
      content: chatHtmlContent,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u.id)
      speaker: ChatMessage.getSpeaker(),
    }

    // Send the roll to chat!
    return rollResult.toMessage(messageData);
  }

  static async meleeAttack(options) {
    const { actor, checkDetails, rollResult } = options;
    const isFail = rollResult.total <= 1;
    let isPlusOneDice = false;
    let isDoubleDamage = false;
    let isCrit = false;
    let bonusFromAccResult = "";
    if (rollResult.total >= 20) {
      bonusFromAccResult = "Double Damage";
      isDoubleDamage = true;
    } else if (rollResult.total >= 16) {
      bonusFromAccResult = "+1 Damage Dice";
      isPlusOneDice = true;
    }
    if (rollResult.dice[0].results[0].result == 20) {
      bonusFromAccResult += (bonusFromAccResult === "" ? "" : " + ") + "Crit!";
      isCrit = true;
    }
    
    const parts = rollResult.dice.map(d => d.getTooltipData());
    parts[0].flavor = 'Grenade Toss';

    const templateLocation = 'systems/bunkers-and-badasses/templates/chat/melee-attack-roll.html';
    const chatHtmlContent = await renderTemplate(templateLocation, {
      actorId: actor.id,
      checkType: 'Melee Attack',
      overallRollFormula: rollResult.formula,
      parts: parts,
      total: rollResult.total,
      showDamageButton: true,
      bonusFromAccResult: bonusFromAccResult,
      attackType: 'melee',
      success: !isFail,
      failure: isFail,
      isPlusOneDice: isPlusOneDice,
      isDoubleDamage: isDoubleDamage,
      isCrit: isCrit,
      critHit: isCrit,
    });
    
    // Prep chat values.
    const flavorText = `${actor.name} attempts to strike a target.`;
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: flavorText,
      //type: CONST.CHAT_MESSAGE_STYLES.ROLL,
      roll: rollResult,
      rollMode: CONFIG.Dice.rollModes.publicroll,
      content: chatHtmlContent,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u.id)
      speaker: ChatMessage.getSpeaker(),
    }

    // Send the roll to chat!
    return rollResult.toMessage(messageData);
  }

  static async rangedAttack(options) {
    const { actor, item, rollResult } = options;
    const combatBonuses = actor.system?.bonus?.combat;

    const isNatCrit = rollResult.dice[0].results[0].result == 20;
    const isFail = rollResult.dice[0].results[0].result <= 1
      || rollResult.total <= 1;

    // Determine the hits and crits tier.
    let attackAccRank = null;
    if (isFail) { attackAccRank = ''; }
    else if (rollResult.total >= 16) { attackAccRank = 'high'; }
    else if (rollResult.total >= 8) { attackAccRank = 'mid'; }
    else if (rollResult.total >= 2) { attackAccRank = 'low'; }

    const hitsAndCrits = this._determineHitsAndCrits({
      item: item,
      attackAccRank: attackAccRank,
      combatBonuses: combatBonuses,
      isCrit: isNatCrit,
      isFail: isFail
    });

    // Prepare the results for easier display.
    const parts = rollResult.dice.map(d => d.getTooltipData());
    parts[0].flavor = item.system.type.name + ' Attack';

    // Generate message for chat.
    const templateLocation = 'systems/bunkers-and-badasses/templates/chat/gun-attack-roll.html';
    const chatHtmlContent = await renderTemplate(templateLocation, {
      actor: actor,
      item: item,

      overallRollFormula: rollResult.formula,
      parts: parts,
      total: rollResult.total,
      
      attackLabel: item.system.type.name,
      attackType: 'shooting',

      hits: hitsAndCrits.hits,
      crits: hitsAndCrits.crits,
      
      bonusCritsText: (isNatCrit ? "+1 Crit (already added)" : ""),
      isNat20: isNatCrit,
      success: !isFail,   
      failure: isFail, 
    });

    // Prep chat values.
    const flavorText = `${actor.name} attempts to to shoot with <b>${item.name}</b>.`;
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: flavorText,
      //type: CONST.CHAT_MESSAGE_STYLES.ROLL,
      roll: rollResult,
      rollMode: CONFIG.Dice.rollModes.publicroll,
      content: chatHtmlContent,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u.id)
      speaker: ChatMessage.getSpeaker(),
    }

    // Send the roll to chat!
    const ret = await rollResult.toMessage(messageData);
    return ret;
  }

  static _determineHitsAndCrits(options) {
    const { item, attackAccRank, combatBonuses, isCrit, isFail } = options;
    
    let hitsAndCrits = {};
    
    // Determine base hits and crits from the success level.
    if (attackAccRank) {
      hitsAndCrits = {...item.system.accuracy[attackAccRank]};
      hitsAndCrits.hits += 
        (combatBonuses?.hits ? (combatBonuses?.hits[attackAccRank] ?? 0) : 0)
        + (combatBonuses?.hits?.all ?? 0);
      hitsAndCrits.crits += 
        (combatBonuses?.crits ? (combatBonuses?.crits[attackAccRank] ?? 0) : 0)
        + (combatBonuses?.crits?.all ?? 0);
    } else {
      hitsAndCrits = { hits: 0, crits: 0 };
      hitsAndCrits.hits += (combatBonuses?.special?.hitsSuperLow ?? 0);
      hitsAndCrits.crits += (combatBonuses?.special?.critsSuperLow ?? 0);
    }

    // Account for the bonus crit from a nat 20, and any player bonuses for crits or fails.
    if (isCrit) {
      hitsAndCrits.crits += 1;
      hitsAndCrits.hits += (combatBonuses?.special?.hits20 ?? 0);
      hitsAndCrits.crits += (combatBonuses?.special?.crits20 ?? 0);
    } else if (isFail) {
      hitsAndCrits.hits += (combatBonuses?.special?.hits1 ?? 0);
      hitsAndCrits.crits += (combatBonuses?.special?.crits1 ?? 0);
    }

    return hitsAndCrits;
  }

  static async grenadeThrow(options) {
    const { actor, itemId, checkDetails, rollResult } = options;
    const item = actor.items.get(itemId);
    const difficultyValue = checkDetails.difficultyValue;

    const parts = rollResult.dice.map(d => d.getTooltipData());
    parts[0].flavor = 'Grenade Toss';

    const templateLocation = 'systems/bunkers-and-badasses/templates/chat/check-roll.html';
    const chatHtmlContent = await renderTemplate(templateLocation, {
      actorId: actor.id,
      itemId: item.id,
      checkType: `${item.name} Grenade Toss`,
      overallRollFormula: rollResult.formula,
      parts: parts,
      total: rollResult.total,
      difficulty: difficultyValue,
      redText: item.system.redText,
      attackType: 'grenade',
      showDamageButton: true,
      success: (difficultyValue != null) && rollResult.total >= difficultyValue,
      failure: (difficultyValue != null) && rollResult.total < difficultyValue,
      itemEffect: item.system.effect,
      redTextDetails: {
        redText: item.system.redText,
        redTextEffect: item.system.redTextEffect,
        redTextEffectBM: item.system.redTextEffectBM,
      },
    });

    // Prep chat values.
    const flavorText = `${actor.name} attempts to throw a grenade.`;
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: flavorText,
      //type: CONST.CHAT_MESSAGE_STYLES.ROLL,
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

  static async damageResult(options) {
    const { actor, item, isMelee, rollResult, isDoubled } = options;

    const damageDetails = DamageDiceRollDataExtractHelper.turnRollResultIntoDamageData({
      rollResult: rollResult,
      isMelee: isMelee,
      isDoubled: isDoubled
    });

    const templateLocation = 'systems/bunkers-and-badasses/templates/chat/damage-results.html';
    const chatHtmlContent = await renderTemplate(templateLocation, {
      actorId: actor.id,
      itemId: item?.id ?? '',
      isMelee: isMelee,
      parts: damageDetails.parts,
      overallRollFormula: damageDetails.overallRollFormula.join(' + '),
      overallResultTotal: damageDetails.overallResultTotal.join(' + '),
    });

    // Prep chat values.
    const damageWith = (item
      ? item.name
      : 'a strike');
    const flavorText = `${actor.name} deals damage with ${damageWith}.`;
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: flavorText,
      //type: CONST.CHAT_MESSAGE_STYLES.ROLL,
      roll: rollResult,
      rollMode: CONFIG.Dice.rollModes.publicroll,
      content: chatHtmlContent,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u.id)
      speaker: ChatMessage.getSpeaker(),
    }
    
    // Send the roll to chat!
    return await rollResult.toMessage(messageData);
  }

  static async itemInfo(options) {
    const actor = options.actor;
    const item = await Enricher.enrichItem(options.item);

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
      type: CONST.CHAT_MESSAGE_STYLES.IC,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u.id)
      speaker: ChatMessage.getSpeaker(),
      ...messageDetail
    };

    // Send the roll to chat!
    return ChatMessage.create(messageData);
  }

  static async useActionSkill(options) {
    const { actor, item } = options;
    
    // Prep chat values.
    const templateLocation = `systems/bunkers-and-badasses/templates/chat/info/action-skill-info.html`;
    const renderTemplateConfig = {
      actorId: actor.id,
      description: item.system.description,
      item: item
    };
    const content = await renderTemplate(templateLocation, renderTemplateConfig);

    const flavorText = `${actor.name} uses <b>${item.name}</b>.`;
    
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: flavorText,
      type: CONST.CHAT_MESSAGE_STYLES.IC,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u.id)
      speaker: ChatMessage.getSpeaker(),
      content: content,
    }

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
    
    // Create flavor text.
    const flavorTextItemName = `<div class="flavor-text-inner">${flavorPrefix}<b>${item.name}</b> ${item.system.type.name}</div>`;
    const flavorTextLevelAndGuild = `<div class="level-and-guild">${levelAndGuild}</div>`;

    // Create additional message details object.
    return {
      flavor: `<div class="flavor-text-wrapper">${flavorTextItemName}${flavorTextLevelAndGuild}</div>`,
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
    
    // Create flavor text.
    const flavorTextItemName = `<div  class="flavor-text-inner"><b>${item.name}</b> ${capHealthType} Protection.</div>`;
    const flavorTextLevelAndGuild = `<div class="level-and-guild">${levelAndGuild}</div>`;

    // Create additional message details object.
    return {
      flavor: `<div class="flavor-text-wrapper">${flavorTextItemName}${flavorTextLevelAndGuild}</div>`,
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
    
    // Create flavor text.
    const flavorTextItemName = `<div class="flavor-text-inner"><b>${item.name}</b> Grenade.</div>`;
    const flavorTextLevelAndGuild = `<div class="level-and-guild">${levelAndGuild}</div>`;

    // Create additional message details object.
    return {
      flavor: `<div class="flavor-text-wrapper">${flavorTextItemName}${flavorTextLevelAndGuild}</div>`,
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

  static async npcAttack(options) {
    const { actor, item, rollResult } = options;

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

    const bonusResult = isCrit
      ? "Double damage" 
      : (bonusDamage > 0 ? `Deal +${bonusDamage} damage` : '');

    const parts = rollResult.dice.map(d => d.getTooltipData());
    parts[0].flavor = "Attaaaaack!";
    
    const templateLocation = 'systems/bunkers-and-badasses/templates/chat/npc-attack-roll.html';
    const chatHtmlContent = await renderTemplate(templateLocation, {
      actorId: actor.id,
      overallRollFormula: rollResult.formula,
      result: rollResult.result,
      parts: parts,
      total: rollResult.total,
      success: !isFail,
      failure: isFail,
      isCrit: isCrit,
      bonusResult: bonusResult
    });

    // Prep chat values.
    const flavorText = `${actor.name} makes an attack with <b>${actor.system.weapon}</b>.`;
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: flavorText,
      //type: CONST.CHAT_MESSAGE_STYLES.ROLL,
      roll: rollResult,
      rollMode: CONFIG.Dice.rollModes.publicroll,
      content: chatHtmlContent,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u.id)
      speaker: ChatMessage.getSpeaker(),
    }

    // Send the roll to chat!
    return rollResult.toMessage(messageData);
  }

  static async npcAction(options) {
    const { actor, dataset } = options;
    const actionObject = genericUtil.deepFind(actor, dataset.path);

     // Prep chat values.
     const flavorText = `${actor.name} uses <i>${actionObject.name}</i>.`;
     const messageData = {
       user: game.user.id,
       speaker: ChatMessage.getSpeaker({ actor: actor }),
       flavor: flavorText,
       content: actionObject.description,
       type: CONST.CHAT_MESSAGE_STYLES.IC,
       // whisper: game.users.entities.filter(u => u.isGM).map(u => u.id)
       speaker: ChatMessage.getSpeaker(),
     }
 
     // Send the roll to chat!
     return ChatMessage.create(messageData);
  }

  static async meleeAndHPDice(options) {
    const { actor, rollResult } = options;

    const flavorText = `${actor.name} rolls their Melee Dice.`;
    return rollResult.toMessage({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: flavorText,
      //type: CONST.CHAT_MESSAGE_STYLES.ROLL,
      roll: rollResult,
      rollMode: CONFIG.Dice.rollModes.publicroll,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u.id)
      speaker: ChatMessage.getSpeaker(),
    });
  }
}