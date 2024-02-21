export class BNBCombatant extends Combatant {
  /** @override */
  _getInitiativeFormula() {
    const actor = this.actor;
    if (actor.type == "npc") {
      const initVal = actor.system?.badass?.rank ?? 0;
      return `${initVal}[Badass Rank]`;
    } else {
      const initiative = actor.system.checks.initiative;
      const statToUse = initiative?.stat ?? 'spd';
      const isBadass = actor.system.attributes.badass.rollsEnabled;

      const badassRank = actor.system.attributes.badass.rank;
      //const initValue = initiative.value; // This is equal to the stat bonus, so we go to the source instead.
      const statBonus = actor.system[statToUse]?.modToUse ?? 0;
      const initMisc = initiative.misc;
      const initEffects = initiative.effects;
      //const initTotal = initiative.total; // This total is not used in the formula

      const badassText = badassRank ? ` + ${badassRank}[Badass Rank]` : '';
      const statVsModText = isBadass ? 'Stat' : 'Mod';
      const statBonusText = statBonus ? ` + ${statBonus}[${statToUse.toUpperCase()} ${statVsModText}]` : '';
      const initMiscText = initMisc ? ` + ${initMisc}[Misc Bonus]` : '';
      const initEffectsText = initEffects ? ` + ${initEffects}[Effects]` : '';

      return `1d20${badassText}${statBonusText}${initMiscText}${initEffectsText}`;
    }
    return '1d20';
  }
}