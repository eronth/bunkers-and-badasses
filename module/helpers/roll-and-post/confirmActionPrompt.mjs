import { PerformRollAction } from "./performRollAction.mjs";

export class ConfirmActionPrompt {
  static async takeDamage(event, options) {
    const { actor } = options;
    const templateLocation = "systems/bunkers-and-badasses/templates/dialog/take-damage.html";
    const takeDamageDialogContent = await renderTemplate(templateLocation, { });

    this.takeDamageDialog = new Dialog({
      title: `Take Damage`,
      Id: `take-damage-dialog`,
      content: takeDamageDialogContent,
      buttons: {
        "Cancel": {
          label: "Cancel",
          callback : async (html) => {}
        },
        "Take Damage" : {
          label: `Take Damage`,
          callback : async (html) => {
            return await PerformRollAction.takeDamage(html, { actor: actor });
          }
        }
      }
    }).render(true);
  }

  static async checkRoll(event, options) {
    // Prep data to access.
    const { actor, dataset } = options;
    const check = actor.system.checks[dataset.checkType.toLowerCase()];

    if (check.nonRolled) return; // Special case for movement, since I (potentially foolishly) bundled it with checks.
    if (dataset.checkType.toLowerCase() === 'initiative') {
      return actor.rollInitiative({createCombatants: true});
    }

    return await this._makeCheck(event, {
      actor: actor,
      checkDetails: {
        checkTitle: `${actor.system[check.stat].label} Check`,
        checkType: {
          super: dataset.checkType,
          rollType: dataset.rollType,
        },
        defaultDifficulty: null,
        check: check,
        promptCheckType: true
      }
    });
  }

  static async _makeCheck(event, options) {
    // Prep data to access.
    const { actor, checkDetails } = options;

    const templateLocation = 'systems/bunkers-and-badasses/templates/dialog/check-difficulty.html';
    const dialogHtmlContent = await renderTemplate(templateLocation, {
      attributes: actor.system.attributes,
      check: checkDetails.check,
      promptCheckType: checkDetails.promptCheckType ?? false,
      isBadass: actor.system.attributes.badass.rollsEnabled,
      defaultDifficulty: checkDetails.defaultDifficulty,
    });

    this.check = new Dialog({
      title: checkDetails.checkTitle,
      Id: 'check-difficulty',
      content: dialogHtmlContent,
      buttons: {
        'Cancel': {
          label : 'Cancel',
          callback : async (html) => {}
        },
        'Roll': {
          label: 'Roll',
          callback: async (html) => {
            return await PerformRollAction.skillCheck(html, options);
          }
        }
      }
    }).render(true);
  }

}