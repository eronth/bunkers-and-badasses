import { Dropdown } from "./dropdown.mjs";
import { ItemList } from "./itemList.mjs";

export class HandlebarsHelperUtil {
  static prepareHandlebarsHelpers() {
    // If you need to add Handlebars helpers, here are a few useful examples:
    Handlebars.registerHelper('concat', function() {
      let outStr = '';
      for (let arg in arguments) {
        if (typeof arguments[arg] != 'object') {
          outStr += arguments[arg];
        }
      }
      return outStr;
    });

    Handlebars.registerHelper('adder', function() {
      let sum = 0;
      for (let arg in arguments) {
        if (typeof arguments[arg] != 'object') {
          let addValue = parseInt(arguments[arg]);
          sum += (isNaN(addValue)) ? 0 : addValue;
        }
      }
      return sum;
    });

    Handlebars.registerHelper('capitalize', function(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    Handlebars.registerHelper('toLowerCase', function(str) {
      return str.toLowerCase();
    });

    Handlebars.registerHelper('toUpperCase', function(str) {
      return str.toUpperCase();
    });

    Handlebars.registerHelper('enrich', function(str) {
      return TextEditor.enrichHTML(str, {async: false});;
    });

    Handlebars.registerHelper('toArray', (...values) => {
      // Omit the Handlebars options object.
      return values.slice(0, values.length - 1);
    });

    Handlebars.registerHelper('lootCategoryIsCollapsed', (isCollapsed, category) =>
      (isCollapsed
      ? (isCollapsed[category] ?? false)
      : false)
    );

    Handlebars.registerHelper('toFavoredElementObject', function(...values) {
      return {label: values[0], favored: values[1]};
    });

    Handlebars.registerHelper('hpTitle', function(str) {
      if (str === "flesh")
        str = "health";
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    Handlebars.registerHelper('hpToRecoveryTitle', function(str) {
      let recoveryTitle = str;
      
      const textToCheck = str.toLowerCase();
      if (textToCheck === 'flesh' || textToCheck === 'health')
        recoveryTitle = 'regen';
      else if (textToCheck === 'shield')
        recoveryTitle = 'recharge';
      else if (textToCheck === 'armor')
        recoveryTitle = 'repair';
      else if (textToCheck === 'bone')
        recoveryTitle = 'regrow';
      else if (textToCheck === 'eridian')
        recoveryTitle = 'reinvigorate';

        return recoveryTitle;
    });

    Handlebars.registerHelper('getBestHealthShade', function(str) {
      if (str === "flesh")
        str = "dark";
      else if (str === "shield")
        str = "dark";
      else if (str === "armor")
        str = "dark";
      else if (str === "bone")
        str = "dark";
      else if (str === "eridian")
        str = "dark";
      return str;
    });

    Handlebars.registerHelper('shortName', function(str) {
      let check = str.toLowerCase();
      if (check === 'submachine gun')
        return 'SMG';
      else if (check === 'combat rifle')
        return 'Rifle';
      else if (check === 'sniper rifle')
        return 'Sniper';
      else if (check === 'rocket launcher')
        return 'RL';
      else
        return str;
    });

    Handlebars.registerHelper('addPlusIfPositive', (value) => {
        return (value >= 0) ? `+${value}` : value;
      }
    );

    Handlebars.registerHelper('listIsEmpty', (list) => {
        return (list === null || list.length === 0);
      }
    );

    // Dropdown related helpers.
    Handlebars.registerHelper('dropdownComponentClass', ((componentType) => 
      Dropdown.getComponentClass(componentType)));

    Handlebars.registerHelper('dropdownComponentCss', ((componentType) =>
      Dropdown.getComponentCss(componentType)));

    Handlebars.registerHelper('dropdownHeaderLocation', ((itemType) =>
      Dropdown.getHeaderTemplateLocation(itemType)));

    Handlebars.registerHelper('itemDetailsBlockTemplateLocation', ((detailsTemplateType) =>
      ItemList.getItemDetailsBlockTemplateLocation(detailsTemplateType)));
  }
}