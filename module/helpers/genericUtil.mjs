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
}