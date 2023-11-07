import { PostToChat } from "./postToChat.mjs";
import { RollBuilder } from "../roll-builder.mjs";

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
    return { total: 0 };
  }

  static async skillCheck(html, options) {
    const { actor, itemId, checkDetails } = options;
    const checkName = checkDetails.checkType.super;
    const checkStat = checkDetails.check.stat;

    // Pull data from html.
    const hasMisc = (parseInt(html.find("#misc")[0].value) ?? 0) > 0;
    const hasEff = (parseInt(html.find("#effects")[0].value) ?? 0) > 0;
    const extraBonusValue = parseInt(html.find("#extra")[0].value);
    const hasExtra = (extraBonusValue ?? 0) > 0;
    const difficultyValue = parseInt(html.find("#difficulty")[0].value);
    const checkTypeElement = html.find("#check-type");

    if (checkTypeElement && checkTypeElement.length > 0) {
      checkDetails.checkType.sub = checkTypeElement[0].value;
    } 
    const difficultyEntered = !isNaN(difficultyValue);

    // Prepare and roll the check.
    const badassMod = checkDetails.usesBadassRank ? ' + @badassrank[Badass Rank]' : ''
    const rollStatMod = ` + @${checkStat.toLowerCase()}[${checkStat.toUpperCase()} ${actor.system.attributes.badass.rollsEnabled ? 'Stat' : 'Mod'}]`;
    const rollMiscBonus = hasMisc ? ` + @${checkName.toLowerCase()}misc[Misc]` : '';
    const rollEffectBonus = hasEff ? ` + @${checkName.toLowerCase()}effects[Effects]` : '';
    const rollExtraMod = hasExtra ? (isNaN(extraBonusValue) || extraBonusValue == 0 ? '' : ` + @extrabonusvalue[Extra Bonus]`) : '';
    const rollDifficulty = ((difficultyValue != null && !isNaN(difficulty)) ? `cs>=${difficultyValue}` : ``);
    const rollFormula = `1d20${badassMod}${rollStatMod}${rollMiscBonus}${rollEffectBonus}${rollExtraMod}${rollDifficulty}`;
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
}