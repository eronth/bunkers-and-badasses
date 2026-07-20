export class genericUtil {
  static capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  static healthTypeToText(healthType) {
    if (healthType === 'flesh') {
      return "health";
    } else if (healthType === 'Flesh') {
      return "Health";
    } else if (healthType === 'FLESH') {
      return "HEALTH";
    } else {
      return healthType;
    }
  }

  static getAllElementalDamageTypes(options) {
    const damageTypes = ["incendiary", "shock", "corrosive",
    "explosive", "radiation", "cryo",
    "incendiation", "corroshock", "crysplosive"]

    if (options?.includeSpecialTypes) {
      damageTypes.push(...["plasma"]);
    }
    return damageTypes;
  }

  static getAllNonElementalDamageTypes(options) {
    const damageTypes = [ 'kinetic' ];
    return damageTypes;
  }

  static getAllDamageTypes(options) {
    const damageTypes = [
      ...this.getAllNonElementalDamageTypes(options),
      ...this.getAllElementalDamageTypes(options)
    ];
    return damageTypes;
  }

  static createElementIcon({ id, elementType, cssClass, isMelee }) {
    const cssModifier = isMelee ? 'melee-' : '';
    const pathModifier = isMelee ? 'melee/' : '';
    const idModifier = isMelee ? 'Melee' : '';
    const elementDisplayNameModifier = isMelee ? 'Melee ' : '';

    const elementKey = elementType.toLowerCase();
    const elementFileName = this.capitalize(elementKey);
    const elementDisplayName = elementDisplayNameModifier + this.capitalize(elementKey);
    return `<img id="${id}${idModifier}${elementDisplayName}" alt="${elementDisplayName}" title="${elementDisplayName}"
    class="element-type-icon ${cssClass} element-${cssModifier}${elementKey}" src="systems/bunkers-and-badasses/assets/elements/${pathModifier}${elementFileName}.png" />`;
  }

  static createElementDamageHtml({ elements, iconId }) {
    const plusSeparator = `<label class="element-damage-plus"> + </label>`;

    const damageLabels = Object.entries(elements ?? {})
      .filter(([, element]) => element.enabled)
      .map(([key, element]) => {
        // Kinetic has no icon of its own, the damage number stands alone.
        const elemIcon = (key === 'kinetic')
          ? ''
          : this.createElementIcon({ id: iconId, elementType: key, cssClass: 'element-damage-icon' });

        return `<label class="bolded dice-element-single element-damage-nowrap-label ${key}-text">${element.damage} ${elemIcon}</label>`;
      });

    return (damageLabels.length
      ? `<span class="dice-element-list">${damageLabels.join(` ${plusSeparator}`)}</span>`
      : '');
  }

  static createGunDamagePerHitHtml(options) {
    return this.createElementDamageHtml({ elements: options.elements, iconId: 'gunDmg' });
  }

  static createGunBonusDamageHtml(options) {
    return this.createElementDamageHtml({ elements: options.elements, iconId: 'gunDmg' });
  }

  static createGrenadeDamageHtml(options) {
    return this.createElementDamageHtml({ elements: options.elements, iconId: 'gDmg' });
  }

  static createMiniShieldResistHtml(options) {
    const elements = options.elements;

    let shieldResistString = '';
    Object.entries(elements).forEach(e => {
      const [key, element] = e;
      if (element.enabled) {
        const iconData = {id: 'resist', elementType: key, cssClass: 'element-resist-icon' };
        shieldResistString += this.createElementIcon(iconData);
      }
    });

    //const diceAndTypeHtml = (damageHtmlString ? damageHtmlString.slice(0, finalPlus.length * -1) : '');
    const diceAndTypeHtml = shieldResistString;
    return (diceAndTypeHtml ? `<span class="dice-element-list shield-mini-resists">${diceAndTypeHtml}</span>` : '');
  }

  static createFullShieldResistHtml(options) {
    const elements = options.elements;

    let shieldResistString = '';
    Object.entries(elements).forEach(e => {
      const [key, element] = e;
      if (element.enabled) {
        const iconData = {id: 'resist', elementType: key, cssClass: 'element-resist-icon' };
        const elemIcon = ((e[0] === "kinetic") 
          ? ''
          : ` ${this.createElementIcon(iconData)}`);

        shieldResistString += `<label class='bolded dice-element-single ${key}-text element-resist-text'>${element.damage}${elemIcon}</label> `;
      }
    });
    
    //const diceAndTypeHtml = (damageHtmlString ? damageHtmlString.slice(0, finalPlus.length * -1) : '');
    const diceAndTypeHtml = shieldResistString;
    return (diceAndTypeHtml ? `<span class="dice-element-list">${diceAndTypeHtml}</span>` : '');
  }

  static isNullOrEmptyObject(obj) {
    if (obj === null || obj === undefined) {
      return true;
    }
    return Object.keys(obj).length === 0 && obj.constructor === Object;
  }

  static isNullOrEmpty(value) {
    return value == null || value === '';
  }

  static deepFind(obj, path) {
    const paths = path.split('.');
    let current = obj;

    for (let i = 0; i < paths.length; ++i) {
      if (current[paths[i]] == undefined) {
        return undefined;
      } else {
        current = current[paths[i]];
      }
    }
    return current;
  }
}