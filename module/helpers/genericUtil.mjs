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

  static createElementIcon({id, elementName, cssClass}) {
    return `<img id="${id}${elementName}" alt="${elementName}" title="${elementName}"
    class=${cssClass} src="systems/bunkers-and-badasses/assets/elements/${elementName}.png" />`;
  }

}