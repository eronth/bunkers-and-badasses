import { PerformRollAction } from "./performRollAction.mjs";
import { OnActionUtil } from "../onActionUtil.mjs";
import { PostToChat } from "./postToChat.mjs";

export class ConfirmActionPrompt {
  
  static async badassRoll(event, options) {
    // Prep data to access.
    const { actor, checkDetails } = options;

    const templateLocation = 'systems/bunkers-and-badasses/templates/dialog/badass-roll.html';
    const dialogHtmlContent = await renderTemplate(templateLocation, {
      badassRank: actor.system.attributes.badass.rank,
      badassRankEffectBonus: actor.system.bonus.badass,
      tokenCost: 1,
    });

    this.check = new Dialog({
      title: 'Badass Roll',
      Id: 'badass-roll',
      content: dialogHtmlContent,
      buttons: {
        'Cancel': {
          label : 'Cancel',
          callback : async (html) => {}
        },
        'Roll': {
          label: 'Roll',
          callback: async (html) => {
            return await PerformRollAction.badassRoll(html, options);
          }
        }
      }
    }).render(true);
  }
  
  // static async deleteItem(event, options) {
  //   const { actor, itemId } = options;
  //   const item = actor.items.get(itemId);
  //   const templateLocation = "systems/bunkers-and-badasses/templates/dialog/delete-item.html";
  //   const deleteItemDialogContent = await renderTemplate(templateLocation, { item: item });

  //   this.deleteItemDialog = new Dialog({
  //     title: `Delete ${item.name}?`,
  //     Id: `delete-item-dialog`,
  //     content: deleteItemDialogContent,
  //     buttons: {
  //       "Cancel": {
  //         label: "Cancel",
  //         callback : async (html) => {}
  //       },
  //       "Delete" : {
  //         label: `Delete`,
  //         callback : async (html) => {
  //           return await OnActionUtil.onItemDelete(html, { actor: actor, itemId: itemId });
  //         }
  //       }
  //     }
  //   }).render(true);
  // }
  
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
    const { actor, dataset, defaultDifficulty } = options;
    const check = actor.system.checks[dataset.checkType.toLowerCase()];
    const rollType = dataset.rollType;

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
          rollType: rollType,
        },
        defaultDifficulty: defaultDifficulty,
        check: check,
        promptCheckType: (rollType === 'check'),
      },
      itemId: dataset.itemId
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

  static async useActionSkill(event, options) {
    // Prep data
    const { actor } = options;
    if (!actor) { return; }

    const itemId = event.currentTarget.closest('.action-skill-use').dataset.itemId;
    const item = actor.items.get(itemId);
    if (!item) { return; }

    const templateLocation = "systems/bunkers-and-badasses/templates/dialog/use-action-skill.html";
    const useActionSkillDialogContent = await renderTemplate(templateLocation, { item: item });

    this.useActionSkillDialog = new Dialog({
      title: `Activate Action Skill: ${item.name}`,
      Id: `use-action-skill-dialog`,
      content: useActionSkillDialogContent,
      buttons: {
        "Cancel": {
          label: "Cancel",
          callback : async (html) => {}
        },
        "Use" : {
          label: `Use ${item.name}`,
          callback : async (html) => {
            return await OnActionUtil.onActionSkillUse({ html: html, actor: actor, item: item });
          }
        }
      }
    }).render(true);
  }

}