import { genericUtil } from "./genericUtil.mjs";

export class DamageDiceRollDataExtractHelper {
  
  static turnRollResultIntoDamageData(options) {
    const rollResult = options.rollResult;
    const parts = rollResult.dice.map(d => d.getTooltipData());
    const dissectedFormula = this._extractAndRegroupInfoFromRollResult({ rollResult, parts });


    const rollFormulaByDamageTypeComponents = this._amazingDamageFormulaDisplay(dissectedFormula);
    const totalByDamageTypeComponents = this._amazingDamageTotalDisplay(dissectedFormula);
    const newParts = dissectedFormula;
    const summedTotal = rollResult.total;

    const damageData = {
      parts: newParts,
      summedTotal: summedTotal,
      overallRollFormula: rollFormulaByDamageTypeComponents,
      overallResultTotal: totalByDamageTypeComponents,
    };
    return damageData;
  }

  static _extractAndRegroupInfoFromRollResult(options) {
    const rollResult = options.rollResult;
    const parts = options.parts;
    const formulaToDiscect = rollResult._formula;
    const formulaSegments = formulaToDiscect.split('] + ');
    
    // {
    //   damageType: damageType, // element type
    //   formula: formulaPart, // string of INCOMPLETE formula
    //   total: totalDamage, // total damage for that type
    // };
    const dissectedFormula = formulaSegments.map(segment => {
      segment += ']';
      // Find the segment of the string that's the formula.
      const formulaPart = segment.substring(0, segment.indexOf('['));
      // Separate out the damage type label.
      const damageType = segment.substring(segment.indexOf('[')+1, segment.indexOf(']'));
      const totalDamage = this._getTotalDamageForType({ rollResult, type: damageType });
      
      return {
        damageType: damageType,
        formula: formulaPart, // Formula segment INCLUDING ANY FLAT BONUSES
        total: totalDamage, // Includes flat bonus
        totalWithoutFlatBonus: 0, // Total without flat bonus
        flatBonus: 0, // Flat bonus
        rolls: [], // Array of roll results, starts empty
      };
    });

    this._mergePartsIntoDissectedFormula({ parts, dissectedFormula });

    return dissectedFormula;
  }

  static _getTotalDamageForType(options) {
    const { rollResult, type } = options;
    let total = 0;
    rollResult.terms.forEach(term => {
      if (term.flavor === type) {
        total += Number(term.total);
      }
    });
    return total;
  }

  static _mergePartsIntoDissectedFormula(options) {
    const { parts, dissectedFormula } = options;
    parts.forEach(part => {
      dissectedFormula.forEach(df => {
        if (part.flavor === df.damageType) {
          if (!df.rolls) { df.rolls = []; } // Initialize if not already.
          df.rolls.push(...part.rolls); // Add the rolls from parts to the dissected formula.
          df.totalWithoutFlatBonus += Number(part.total ?? 0); // Add the total from parts to the dissected formula.
        }
      });
    });
    
    // Calculate the flat bonus to add based on the difference in totals.
    // For whatever reason, the parts totals don't include flat bonuses, 
    // so we have to calculate it from what we know.
    dissectedFormula.forEach(df => {
      const flatToAdd = Number(df.total ?? 0) - Number(df.totalWithoutFlatBonus ?? 0);
      if (flatToAdd != 0) { // If there's a flat bonus, add it to the dissected formula details as needed.
        df.flatBonus = Number(flatToAdd);
        df.rolls.push({ classes: 'flat d1', result: flatToAdd, type: df.damageType });
      }
    });
  }

  static _amazingDamageFormulaDisplay(dissectedFormula) {
    const textFormulas = dissectedFormula.map(df => {
      const formulaPart = df.formula;
      const damageType = df.damageType;
      const damageTypeIcon = genericUtil.createElementIcon({id: 'dmg', elementType: damageType, cssClass: 'element-damage-formula-icon'});
      const returnText = `<span class='${damageType}-text nowrap-element-icon'>${formulaPart}${damageTypeIcon}</span>`;
      return returnText;
    });
    return textFormulas;
  }

  static _amazingDamageTotalDisplay(dissectedFormula) {
    const textDamageTotals = dissectedFormula.map(df => {
      const damageType = df.damageType;
      const damageTypeIcon = genericUtil.createElementIcon({id: 'dmg', elementType: damageType, cssClass: 'element-damage-total-icon'});    
      const returnText = `<span class='${damageType}-text nowrap-element-icon'>${df.total}${damageTypeIcon}</span>`;
      return returnText;
    });
    return textDamageTotals;
  }
}