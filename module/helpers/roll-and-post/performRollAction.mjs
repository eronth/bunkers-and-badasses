import { PostToChat } from "./postToChat.mjs";
import { RollBuilder } from "../roll-builder.mjs";
import { genericUtil } from "../genericUtil.mjs";

export class PerformRollAction {

  static async takeDamage(html, options) {
    // Prep data to access.
    const { actor } = options;
    const actorSystem = actor.system;
    const items = actor.items;
    const hps = actorSystem.attributes.hps;

    // Pull data from html.
    const damageAmount = html.find("#damage-value")[0].value;
    const damageType = $("input[type=radio][name=damage-type-element]:checked")[0].dataset.element.toLowerCase();

    if (isNaN(damageAmount) || damageAmount <= 0) { return; }

    // Determine damage reductions first.
    const resistResult = await this.resistDamage(html, { actor: actor, items: items });

    // Track the amount of damage done to each health type.
    const damageTaken = { };
    const modifyDamage = {
      eridian: {
        x2: [],
        ignore: []
      },
      shield: {
        x2: ['shock', 'corroshock'],        
        ignore: ['radiation', 'incendiation']
      },
      armor: {
        x2: ['corrosive', 'corroshock'],
        ignore: []
      },
      flesh: {
        x2: ['incendiary', 'incendiation'],
        ignore: []
      },
      bone: {
        x2: ['cryo', 'crysplosive'],
        ignore: []
      },
    };

    // Calculate how much damage is taken to each health type.
    const reductionAmount = (resistResult.total > damageAmount) ? damageAmount : resistResult.total;
    let damageToDeal = damageAmount - resistResult.total;
    if (damageToDeal < 0) { damageToDeal = 0; }

    Object.entries(hps).forEach(([healthType, hpValues]) => {
      // Skip over healthbars that don't get hit by this damage type.
      if (!modifyDamage[healthType].ignore.includes(damageType)) {

        // Initialize a damage taken for a healthbar to 0 if it hasn't been initialized yet.
        if (damageTaken[healthType] == null) { damageTaken[healthType] = 0; }

        // Looping is not the most efficient way to do this, but it's the easiest for my frail mind (for now).
        while (damageToDeal > 0 && hps[healthType].value > damageTaken[healthType]) {
          damageTaken[healthType]++;
          if (modifyDamage[healthType].x2.includes(damageType)) {
            damageTaken[healthType]++; // Double damage for x2 damage types.
          }
          damageToDeal--;
        }

        // After while loop, findalize values as needed.
        if (damageTaken[healthType] > hps[healthType].value) {
          // Don't overshoot! Going forward this will help with displaying the damage to chat.
          damageTaken[healthType] = hps[healthType].value;
        }
        
        // Make the Health take the damage.
        hps[healthType].value -= damageTaken[healthType];
      }
    });

    const damageRoll = new Roll((reductionAmount ? `${damageAmount} - ${reductionAmount}` : `${damageAmount}`), actor.getRollData());
    const damageResult = await damageRoll.roll({async: true});

    PostToChat.damageResistance({actor: actor, rollResult: resistResult, reductionAmount: reductionAmount, damageType: damageType});
    PostToChat.damageTaken({actor: actor, rollResult: damageResult, damageAmount: damageAmount, damageTaken: damageTaken, damageType: damageType });

    // Square brackets needed to get the right value.
    const attributeLabel = `system.attributes.hps`;
    return await actor.update({[attributeLabel]: hps});
  }

  static async resistDamage(html, options) {
    const damageType = $("input[type=radio][name=damage-type-element]:checked")[0].dataset.element.toLowerCase();
    const { actor, items } = options;

    const reductions = [];
    if (items?._source) {
      Object.entries(items._source).forEach(([key, item]) => {
        if (item.type === 'shield' && item.system.equipped
        && item.system.elements[damageType].enabled
        && item.system.elements[damageType].damage.length > 0) {
          reductions.push(item.system.elements[damageType].damage);
        }
      });
    }

    if (reductions.length > 0) { 
      const roll = new Roll(reductions.join(' + '), actor.getRollData());
      const rollResult = await roll.roll({async: true});
      return rollResult;
    }
    return { total: 0, isFakeRollResult: true };
  }

  static async skillCheck(html, options) {
    const { actor, itemId, checkDetails } = options;
    const checkName = checkDetails.checkType.super;
    const checkStat = checkDetails.check.stat;

    // Pull data from html.
    const gearElements = html.find("#gear");
    const gearValue = (gearElements.length > 0) ? parseInt(gearElements[0].value) : 0;
    const hasGear = gearValue != 0;
    const hasMisc = (parseInt(html.find("#misc")[0].value) ?? 0) != 0;
    const hasEff = (parseInt(html.find("#effects")[0].value) ?? 0) != 0;
    const extraBonusValue = (html.find("#extra")[0].value);
    const hasExtra = !genericUtil.isNullOrEmpty(extraBonusValue ?? 0) && extraBonusValue != '0';
    const difficultyValue = parseInt(html.find("#difficulty")[0].value);
    const checkTypeElement = html.find("#check-type");

    if (checkTypeElement && checkTypeElement.length > 0) {
      checkDetails.checkType.sub = checkTypeElement[0].value;
    }

    // Prepare and roll the check.
    const badassMod = checkDetails.usesBadassRank ? ' + @badassrank[Badass Rank]' : ''
    const rollStatMod = ` + @${checkStat.toLowerCase()}[${checkStat.toUpperCase()} ${actor.system.attributes.badass.rollsEnabled ? 'Stat' : 'Mod'}]`;
    const rollGearBonus = hasGear ? ` + ${gearValue}[Gear]` : '';
    const rollMiscBonus = hasMisc ? ` + @${checkName.toLowerCase()}misc[Misc]` : '';
    const rollEffectBonus = hasEff ? ` + @${checkName.toLowerCase()}effects[Effects]` : '';
    const rollExtraMod = hasExtra ? ` + @extrabonusvalue[Extra Bonus]` : '';
    const rollDifficulty = '';//((difficultyValue != null && !isNaN(difficultyValue)) ? ` cs>=${difficultyValue}` : ``);
    const rollFormula = `1d20${badassMod}${rollStatMod}${rollGearBonus}${rollMiscBonus}${rollEffectBonus}${rollExtraMod}${rollDifficulty}`;
    const roll = new Roll(
      rollFormula,
      RollBuilder._createDiceRollData(
        { actor: actor },
        { extrabonusvalue: extraBonusValue }
      )
    );
    const rollResult = await roll.roll({async: true});

    // Display the result.
    if (checkDetails.checkType.rollType === 'grenade-throw') {
      return await PostToChat.grenadeThrow({
        actor: actor,
        itemId: itemId,
        checkDetails: {
          ...checkDetails,
          difficultyValue: difficultyValue,
        },
        checkType: checkDetails.checkType,
        rollResult: rollResult,
      });
    } else if (checkDetails.checkType.rollType === 'melee-attack') {
      return await PostToChat.meleeAttack({
        actor: actor,
        itemId: itemId,
        checkDetails: {
          ...checkDetails,
          //difficultyValue: difficultyValue,
        },
        checkType: checkDetails.checkType,
        rollResult: rollResult,
      });
    } else {
      return await PostToChat.skillCheck({
        actor: actor,
        checkDetails: {
          ...checkDetails,
          difficultyValue: difficultyValue,
        },
        rollResult: rollResult
      });
    }
  }

  static async badassRoll(html, options) {
    const { actor, itemId, checkDetails } = options;

    const tokenCostFieldValue = parseInt(html.find("#token-cost")[0].value ?? 0) ?? 0;
    const hasTokenCost = tokenCostFieldValue != 'NaN' && tokenCostFieldValue > 0;
    const tokenCostValue = hasTokenCost ? tokenCostFieldValue : 0;

    if (hasTokenCost) {
      if (actor.system.attributes.badass.tokens < tokenCostValue) {
        ui.notifications.warn(`You don't have enough Badass Tokens to use this ability!`);
        return;
      } else {
        await actor.update({'system.attributes.badass.tokens': actor.system.attributes.badass.tokens - tokenCostValue});
      }
    }
    // IF USES BADASS TOKENS; SPEND THEM!
    // IF USES BADASS TOKENS BUT YOU'RE OUT; CANCEL!

    const effectFieldValue = parseInt(html.find("#effects")[0].value ?? 0) ?? 0;
    const hasEff = effectFieldValue != 'NaN' && effectFieldValue > 0;
    const effectBonusValue = hasEff ? effectFieldValue : 0;
    const extraFieldValue = parseInt(html.find("#extra")[0].value ?? 0) ?? 0;
    const hasExtra = extraFieldValue != 'NaN' && extraFieldValue > 0;
    const extraBonusValue = hasExtra ? extraFieldValue : 0;


    // Get the basic roll result.
    const rollFormula = `1d20[Badass Check]`;
    const roll = new Roll(
      rollFormula,
      RollBuilder._createDiceRollData({ actor: actor })
    );
    const rollResult = await roll.roll({async: true});

    // Adjust the roll result based on badass dice rules.
    let correctedBadassDiceResult = rollResult.total;
    if (correctedBadassDiceResult == 2 || correctedBadassDiceResult == 3) {
      correctedBadassDiceResult = 1;
    } else if (correctedBadassDiceResult == 19 || correctedBadassDiceResult == 18) {
      correctedBadassDiceResult = 20;
    }

    // Add in expected modifiers.
    const badassRankValue = actor.system.attributes.badass.rank;
    const badassTotal = correctedBadassDiceResult + badassRankValue + effectBonusValue + extraBonusValue;

    // Create the display formula.
    const effectBonusFormula = hasEff ? ` + ${effectBonusValue}[Effects Bonus]` : '';
    const extraBonusFormula = hasExtra ? ` + ${extraBonusValue}[Extra Bonus]` : '';
    const finalRollFormula = `1dBadass + ${badassRankValue}[Badass Rank]${effectBonusFormula}${extraBonusFormula}`;
    // TODO implement this guy
    //this._adjustBadassResult(rollResult);

    return await PostToChat.badassRoll({ // TODO implement this.
      actor: actor,
      checkDetails: {
        overallRollFormula: finalRollFormula,
        total: badassTotal,
        badassDiceResult: correctedBadassDiceResult
      },
      rollResult: rollResult,
    });
  }

  static async rangedAttack(html, options) {
    const { actor, item, attackDetails } = options;
    const attackingStat = attackDetails.stat;
    const checkName = 'Shooting';
    const itemStats = item.system.statMods;

    // Pull data from html.
    const gearBonus = (parseInt(html.find("#gear")[0].value) ?? 0);
    const miscBonus = (parseInt(html.find("#misc")[0].value) ?? 0);
    const effectBonus = (parseInt(html.find("#effects")[0].value) ?? 0);
    const extraBonusValue = (html.find("#extra")[0].value);
    
    const hasGear = (gearBonus != 0);
    const hasMisc = (miscBonus != 0);
    const hasEff = (effectBonus != 0);
    const hasExtra = !genericUtil.isNullOrEmpty(extraBonusValue ?? 0) && extraBonusValue != '0';
    const isFavored = html.find("#favored-checkbox")[0].checked;

    // //// SPECIAL special logic for a unique legendary.
    // const rollMstMod = (itemOverrideType.toLowerCase() === 'mwbg')
    //   ? ` + @mst[MST ${actorSystem.attributes.badass.rollsEnabled ? 'Stat' : 'Mod'}]`
    //   : '';
    // const rollGearMstBonus = (itemOverrideType.toLowerCase() === 'mwbg')
    //   ? ` + @gearmst[Gear MST]`
    //   : '';
    // //// /SPECIAL special logic for a unique legendary.

    // stat/mod, misc, effects, extra, gear
    const badassMod = '';
    const rollStatMod = (isFavored
      ? ` + @${attackingStat.toLowerCase()}[${attackingStat.toUpperCase()} ${actor.system.attributes.badass.rollsEnabled ? 'Stat' : 'Mod'}]`
      : '');
    const rollGearBonus = hasGear ? ` + @gear${attackingStat.toLowerCase()}[Gear]` : '';
    const rollMiscBonus = hasMisc ? ` + @${checkName.toLowerCase()}misc[Misc]` : '';
    const rollEffectBonus = hasEff ? ` + @${checkName.toLowerCase()}effects[Effects]` : '';
    const rollExtraMod = hasExtra ? ` + @extrabonusvalue[Extra Bonus]` : '';
    const rollFormula = `1d20${badassMod}${rollStatMod}${rollGearBonus}${rollMiscBonus}${rollEffectBonus}${rollExtraMod}`;

    const roll = new Roll(
      rollFormula,
      RollBuilder._createDiceRollData(
        { actor: actor },
        {
          gearacc: itemStats.acc,
          geardmg: itemStats.dmg,
          gearspd: itemStats.spd,
          gearmst: itemStats.mst,
          extrabonusvalue: extraBonusValue 
        }
      )
    );
    const rollResult = await roll.roll({async: true});

    return await PostToChat.rangedAttack({
      actor: actor,
      item: item,
      // checkDetails: {
      //   ...checkDetails,
      // },
      // checkType: checkDetails.checkType,
      rollResult: rollResult,
    });
  }

  static async dealDamage(html, options) {
    const { actor, item, attackType } = options;
    
    const { hits, crits, perHit, perCrit, perAttack } 
      = await this._pullDamageValuesFromHtml(html, attackType);

    const doubleDamageCheckbox = html.find("#double-damage");
    const isDoubled = (doubleDamageCheckbox.length > 0 && doubleDamageCheckbox[0].checked);

    const summary = {};
    await this._mergeDamageValuesIntoSummary(summary, hits, perHit);
    await this._mergeDamageValuesIntoSummary(summary, crits, perCrit);
    await this._mergeDamageValuesIntoSummary(summary, 1, perAttack);

    const rollForumlaOptions = {
      summary: summary,
      isDoubled: isDoubled
    };

    // Create the roll.
    const rollFormula = await this._createRollFormulaFromSummary(rollForumlaOptions);
    const roll = new Roll(
      rollFormula,
      RollBuilder._createDiceRollData({ actor: actor }, { })
    );
    const rollResult = await roll.roll({async: true});

    return await PostToChat.damageResult({
      actor: actor,
      item: item,
      rollResult: rollResult,
    });
  }

  static async _pullDamageValuesFromHtml(html, attackType) {
    // Pull data from html.
    const loh = html.find("input.hits");
    const hits = loh.length > 0 
      ? parseInt(loh[0].value) 
      : 0;
    //(html.find("input.hits")?.value ?? 0);
    const loc = html.find("input.crits");
    const crits = loc.length > 0 
      ? parseInt(loc[0].value) 
      : 0;
    //(html.find("input.crits")?.value ?? 0);

    const perHitElements = {};
    html.find("input.per-hit").each((index, element) => {
      if (element.value) {
        perHitElements[element.dataset.damageType] = element.value;
      }
    });

    const perCritElements = {};
    html.find("input.per-crit").each((index, element) => {
      if (element.value) {
        perCritElements[element.dataset.damageType] = element.value;
      }
    });

    const perAttackElements = {};
    html.find("input.per-attack").each((index, element) => {
      if (element.value) {
        perAttackElements[element.dataset.damageType] = element.value;
      }
    });

    return {
      hits: hits,
      crits: crits,
      perHit: perHitElements,
      perCrit: perCritElements,
      perAttack: perAttackElements,
    };
  }

  static async _mergeDamageValuesIntoSummary(summary, damageCount, damageList) {
    Object.entries(damageList).forEach(([damageType, damageValue]) => {
      if (damageCount > 0) {
        summary[damageType] = summary[damageType] || [];
        summary[damageType].push(...new Array(damageCount).fill(damageValue));
      }
    });

    return {...summary};
  }

  static async _createRollFormulaFromSummary(rollFormulaOptions) {
    const { summary, isDoubled } = rollFormulaOptions;
    const rollFormula = Object.entries(summary).map(([damageType, damageValues]) => {
      let sumString = `${damageValues.join(' + ')}`;
      if (damageValues.length > 1) { sumString = `(${sumString})`;}
      if (isDoubled) { sumString = `2*(${sumString})`; }
      sumString += `[${damageType}]`;
      return sumString;
    }).join(' + ');

    return rollFormula;
  }

  static async npcAttack(html, options) {
    const { actor } = options;

    // Pull data from html.
    const bonusValue = parseInt(html.find("#bonus")[0].value);
    const targetSpeedValue = parseInt(html.find("#target-speed")[0].value);

    // Prepare and roll the check.
    const rollBonusMod = (!bonusValue || isNaN(bonusValue)) ? '' : ` + @extraBonus[bonus]`;
    const rollTargetSpd = (!targetSpeedValue || isNaN(targetSpeedValue)) ? '' : ` - @targetSpd[target spd mod]`;
    const rollFormula = `1d20${rollBonusMod}${rollTargetSpd}`;
    const roll = new Roll(rollFormula, {
      extraBonus: bonusValue,
      targetSpd: targetSpeedValue
    });
    const rollResult = await roll.roll({async: true});

    // Display the result.
    return await PostToChat.npcAttack({ actor: actor, rollResult: rollResult });
  }

  static async meleeAndHPDice(options) {
    const actor = options.actor;

    const rollFormula = `${actor.system.class.meleeDice}[Melee Dice] + @mstmod[MST mod]`;
    const roll = new Roll(
      rollFormula,
      RollBuilder._createDiceRollData({actor: actor})
    );
    const rollResult = await roll.roll({async: true});

    PostToChat.meleeAndHPDice({actor: actor, rollResult: rollResult});
  }
}