import { genericUtil } from "./genericUtil.mjs";

export class DamageDiceRollDataExtractHelper {
  
  static turnRollResultIntoDamageData(options) {
    const rollResult = options.rollResult;
    const parts = rollResult.dice.map(d => d.getTooltipData());
    const discectedFormula = this._extractAndRegroupInfoFromRollResult({ rollResult, parts });


    const rollFormulaByDamageTypeComponents = this._amazingDamageFormulaDisplay(discectedFormula);
    const totalByDamageTypeComponents = this._amazingDamageTotalDisplay(discectedFormula);
    const newParts = discectedFormula;
    const summedTotal = rollResult.total;

    const damageData = {
      parts: newParts,
      summedTotal: summedTotal,
      overallRollFormula: rollFormulaByDamageTypeComponents,
      overallResultTotal: totalByDamageTypeComponents,
    };
    return damageData;
  }

  /*
  {
    overallRollFormula: 'the total along the top',
    parts: [
      {
        flavor: 'element type',
        formula: 'full formulat (including static numbers)', 
        total: 'total including types for this element'
        rolls: [
          { classes: 'css classes', result: 'result of the dice (or flat) roll', type: 'elem type' },
        ]
      },
    ],
    total: 'the total of all damage, still split out by type!'
  }
  */

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
    const discectedFormula = formulaSegments.map(segment => {
      segment += ']';
      // Find the segment of the string that's the formula.
      const formulaPart = segment.substring(0, segment.indexOf('['));
      // Separate out the damage type label.
      const damageType = segment.substring(segment.indexOf('[')+1, segment.indexOf(']'));
      const totalDamage = this._getTotalDamageForType({ rollResult, type: damageType });
      // // Create the icon for the damage type.
      // const damageTypeIcon = genericUtil.createElementIcon({id: 'dmg', elementType: damageType, cssClass: 'element-damage-formula-icon'});
      // const returnText = `<span class='${damageType}-text'>${formulaPart}${damageTypeIcon}</span>`;
      // return returnText;
      return {
        damageType: damageType,
        formula: formulaPart, // Formula segment INCLUDING ANY FLAT BONUSES
        total: totalDamage, // Includes flat bonus
        totalWithoutFlatBonus: 0, // Total without flat bonus
        flatBonus: 0, // Flat bonus
        rolls: [], // Array of roll results, starts empty
      };
    });

    this._mergePartsIntoDiscectedFormula({ parts, discectedFormula });

    return discectedFormula;
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

  static _mergePartsIntoDiscectedFormula(options) {
    const { parts, discectedFormula } = options;
    parts.forEach(part => {
      discectedFormula.forEach(df => {
        if (part.flavor === df.damageType) {
          if (!df.rolls) { df.rolls = []; } // Initialize if not already.
          df.rolls.push(...part.rolls); // Add the rolls from parts to the discected formula.
          df.totalWithoutFlatBonus += Number(part.total ?? 0); // Add the total from parts to the discected formula.
        }
      });
    });
    
    // Calculate the flat bonus to add based on the difference in totals.
    // For whatever reason, the parts totals don't include flat bonuses, 
    // so we have to calculate it from what we know.
    discectedFormula.forEach(df => {
      const flatToAdd = Number(df.total ?? 0) - Number(df.totalWithoutFlatBonus ?? 0);
      if (flatToAdd != 0) { // If there's a flat bonus, add it to the discected formula details as needed.
        df.flatBonus = Number(flatToAdd);
        df.rolls.push({ classes: 'flat d1', result: flatToAdd, type: df.damageType });
      }
    });
  }

  static _amazingDamageFormulaDisplay(discectedFormula) {
    const textFormulas = discectedFormula.map(df => {
      const formulaPart = df.formula;
      const damageType = df.damageType;
      const damageTypeIcon = genericUtil.createElementIcon({id: 'dmg', elementType: damageType, cssClass: 'element-damage-formula-icon'});
      const returnText = `<span class='${damageType}-text'>${formulaPart}${damageTypeIcon}</span>`;
      return returnText;
    });
    return textFormulas;
  }

  static _amazingDamageTotalDisplay(discectedFormula) {
    const textDamageTotals = discectedFormula.map(df => {
      const damageType = df.damageType;
      const damageTypeIcon = genericUtil.createElementIcon({id: 'dmg', elementType: damageType, cssClass: 'element-damage-total-icon'});    
      const returnText = `<span class='${damageType}-text'>${df.total}${damageTypeIcon}</span>`;
      return returnText;
    });
    return textDamageTotals;
  }
  //   const formulaSegments = formula.split('] + ');
  //   const displaySegments = formulaSegments.map(segment => {
  //     segment += ']';
  //     const formulaPart = segment.substring(0, segment.indexOf('['));
  //     const damageType = segment.substring(segment.indexOf('[')+1, segment.indexOf(']'));
  //     const damageTypeIcon = genericUtil.createElementIcon({id: 'dmg', elementType: damageType, cssClass: 'element-damage-formula-icon'});
  //     const returnText = `<span class='${damageType}-text'>${formulaPart}${damageTypeIcon}</span>`;
        
  //     return returnText;
  //   });//.join(' + ');
  //   return displaySegments; //displayFormula;
  // }

  // static _partsSuperGrouper(parts) {
  //   const gp = {};
  //   parts.forEach(part => {
  //     if (gp[part.flavor] == null) { 
  //       gp[part.flavor] = {
  //         flavor: part.flavor,
  //         formula: '',
  //         formulaChunks: [],
  //         rolls: [],
  //         total: 0,
  //       };
  //     }
  //     gp[part.flavor].formulaChunks.push(part.formula);
  //     gp[part.flavor].rolls.push(...part.rolls);
  //     gp[part.flavor].total += part.total;
  //   });

  //   Object.entries(gp).forEach(entry => {
  //     const [index, part] = entry;
  //     part.formula = part.formulaChunks.join(' + ');
  //     if (part.formulaChunks.length > 1) {
  //       part.formula = `(${part.formula})`;
  //     }
  //   });

  //   return gp;
  // }

  
}