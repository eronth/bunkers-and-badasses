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

}