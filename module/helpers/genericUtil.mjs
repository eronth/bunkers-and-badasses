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

  static createElementIcon({id, elementType, cssClass}) {
    const elementKey = elementType.toLowerCase();
    const elementDisplayName = this.capitalize(elementKey);
    return `<img id="${id}${elementDisplayName}" alt="${elementDisplayName}" title="${elementDisplayName}"
    class="${cssClass} element-${elementKey}" src="systems/bunkers-and-badasses/assets/elements/${elementDisplayName}.png" />`;
  }

  static createGunDamagePerHitHtml(options) {
    const elements = options.elements;
    const finalPlus = `<label class="element-damage-plus"> + </label>`;

    let damageHtmlString = "";
    Object.entries(elements).forEach(e => {
      const [key, element] = e;
      if (element.enabled) {
        const iconData = {id: 'gunDmg', elementType: key, cssClass: 'element-damage-icon'};
        const elemIcon = (e[0] === "kinetic") 
        ? ""
        : this.createElementIcon(iconData);

        damageHtmlString += `<label class='bolded ${key}-text'>${element.damage} ${elemIcon}</label> ${finalPlus}`;
      }
    });
    
    // We need to remove the last plus label, it doesn't belong, then add the "damage" text.
    return (damageHtmlString
      ? damageHtmlString.slice(0, finalPlus.length * -1)
      : '');
  }

  static createGunBonusDamageHtml(options) {
    const elements = options.elements;
    const finalPlus = `<label class="element-damage-plus"> + </label>`;

    let damageHtmlString = '';
    Object.entries(elements).forEach(e => {
      const [key, element] = e;
      if (element.enabled) {
        const iconData = {id: 'gunDmg', elementType: key, cssClass: 'element-damage-icon' };
        const elemIcon = (e[0] === "kinetic") 
          ? ""
          : this.createElementIcon(iconData);

        damageHtmlString += `<label class='bolded ${key}-text'>${element.damage} ${elemIcon}</label> ${finalPlus}`;
      }
    });
    
    // We need to remove the last plus label, it doesn't belong, then add the "damage" text.
    return (damageHtmlString ? damageHtmlString.slice(0, finalPlus.length * -1) : '');
  }

  static createGrenadeDamageHtml(options) {
    const elements = options.elements;
    const finalPlus = `<label class="element-damage-plus"> + </label>`;

    let damageHtmlString = '';
    Object.entries(elements).forEach(e => {
      const [key, element] = e;
      if (element.enabled) {
        const iconData = {id: 'gDmg', elementType: key, cssClass: 'element-damage-icon' };
        const elemIcon = ((e[0] === "kinetic") 
          ? ""
          : this.createElementIcon(iconData));

        damageHtmlString += `<label class='bolded ${key}-text'>${element.damage} ${elemIcon}</label> ${finalPlus}`;
      }
    });

    // We need to remove the last plus label, it doesn't belong, then add the "damage" text.
    return (damageHtmlString ? damageHtmlString.slice(0, finalPlus.length * -1) : '');
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
    
    return shieldResistString;
  }

  static createFullShieldResistHtml(options) {
    const elements = options.elements;

    let shieldResistString = '';
    Object.entries(elements).forEach(e => {
      const [key, element] = e;
      if (element.enabled) {
        const iconData = {id: 'resist', elementType: key, cssClass: 'element-resist-icon' };
        const elemIcon = ((e[0] === "kinetic") 
          ? ""
          : this.createElementIcon(iconData));

        shieldResistString += `<label class='bolded ${key}-text'>${element.damage} ${elemIcon}</label> `;
      }
    });
    
    return shieldResistString;
  }

}