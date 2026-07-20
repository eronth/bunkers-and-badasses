import { Dropdown } from "./dropdown.mjs";
import { ItemList } from "./itemList.mjs";

// Health type -> the word the sheet uses for that pool, and for regaining it.
const HEALTH_TITLES = { flesh: 'health' };
const RECOVERY_TITLES = {
  flesh: 'regen',
  health: 'regen',
  shield: 'recharge',
  armor: 'repair',
  bone: 'regrow',
  eridian: 'reinvigorate',
};
const HEALTH_SHADES = {
  flesh: 'dark',
  shield: 'dark',
  armor: 'dark',
  bone: 'dark',
  eridian: 'dark',
};
const SHORT_NAMES = {
  'submachine gun': 'SMG',
  'combat rifle': 'Rifle',
  'sniper rifle': 'Sniper',
  'rocket launcher': 'RL',
};

export class HandlebarsHelperUtil {
  static prepareHandlebarsHelpers() {
    // Handlebars passes an options object as the final argument, which is never a value we want.
    const argValues = (args) => Array.from(args).slice(0, -1);

    Handlebars.registerHelper('concat', function() {
      return argValues(arguments).join('');
    });

    Handlebars.registerHelper('adder', function() {
      return argValues(arguments).reduce((sum, value) => {
        const addValue = parseInt(value);
        return sum + (isNaN(addValue) ? 0 : addValue);
      }, 0);
    });

    Handlebars.registerHelper('capitalize', (str) =>
      (str ? str.charAt(0).toUpperCase() + str.slice(1) : ''));

    Handlebars.registerHelper('toLowerCase', (str) => (str ?? '').toLowerCase());

    Handlebars.registerHelper('toUpperCase', (str) => (str ?? '').toUpperCase());

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

    Handlebars.registerHelper('hpTitle', (str) => {
      const title = HEALTH_TITLES[str] ?? str ?? '';
      return title.charAt(0).toUpperCase() + title.slice(1);
    });

    Handlebars.registerHelper('hpToRecoveryTitle', (str) =>
      RECOVERY_TITLES[(str ?? '').toLowerCase()] ?? str ?? '');

    Handlebars.registerHelper('getBestHealthShade', (str) =>
      HEALTH_SHADES[str] ?? str ?? '');

    Handlebars.registerHelper('shortName', (str) =>
      SHORT_NAMES[(str ?? '').toLowerCase()] ?? str ?? '');

    Handlebars.registerHelper('addPlusIfPositive', (value) => {
        return (value >= 0) ? `+${value}` : value;
      }
    );

    Handlebars.registerHelper('isPositive', (value) => (value >= 0));

    Handlebars.registerHelper('listIsEmpty', (list) => {
        return (list == null || list.length == 0);
      }
    );

    // hpBar related helpers.
    Handlebars.registerHelper('isEqual', function(value, key, opts) {
      if (value === key) {
        return opts.fn()
      } else {
        return opts.inverse();
      }
    });

    Handlebars.registerHelper('calcPercent', function(current, max) {
      return (max ? (current / max) : 0);
    });


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