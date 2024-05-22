import { genericUtil } from "../genericUtil.mjs";
import { DefaultData } from "../defaultData.mjs";
import { PerformRollAction } from "./performRollAction.mjs";
import { OnActionUtil } from "../onActionUtil.mjs";
import { Enricher } from "../enricher.mjs";
import { PostToChat } from "./postToChat.mjs";

export class ConfirmActionPrompt {
  
  static async deleteItem(event, options) {
    event.stopPropagation();
    const { actor } = options;

    const liList = $(event.currentTarget).parents(".item-element-group");
    const item = actor.items.get(liList.data("itemId"));
    
    const templateLocation = "systems/bunkers-and-badasses/templates/dialog/delete-item.html";
    const deleteItemDialogContent = await renderTemplate(templateLocation, { item: item });

    this.deleteItemDialog = new Dialog({
      title: `Delete ${item.name}?`,
      Id: `delete-item-dialog`,
      content: deleteItemDialogContent,
      buttons: {
        "Cancel": {
          label: "Cancel",
          callback: async (html) => { }
        },
        "Delete" : {
          icon: `<i class="fas fa-trash"></i>`,
          label: `Delete`,
          callback : async (html) => {
            return OnActionUtil.onItemDelete(html, { actor: actor, item: item, li: liList[0], inRender: options.inRender });
          }
        }
      }
    }).render(true);
  }

  static async deleteNpcAction(event, options) {
    event.stopPropagation();
    const actionType = event.currentTarget.dataset.actionType;
    const actionIndex = event.currentTarget.dataset.actionKey;
    const { actor } = options;

    const templateLocation = "systems/bunkers-and-badasses/templates/dialog/delete-npc-action.html";
    const deleteNpcDialogContent = await renderTemplate(templateLocation, {
      action: actor.system.actions[actionType].actionList[actionIndex],
     });

    const deleteOptions = {
      actor: actor,
      actionType: actionType,
      actionIndex: actionIndex,
    };

    this.deleteNpcDialog = new Dialog({
      title: `Delete Action?`,
      Id: `delete-npc-dialog`,
      content: deleteNpcDialogContent,
      buttons: {
        "Cancel": {
          label: "Cancel",
          callback: async (html) => { }
        },
        "Delete" : {
          icon: `<i class="fas fa-trash"></i>`,
          label: `Delete`,
          callback : async (html) => {
            return OnActionUtil.onNpcActionDelete(html, deleteOptions);
          }
        }
      }
    }).render(true);
  }

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
          icon: '<i class="fas fa-dice-d20"></i>',
          label: 'Roll',
          callback: async (html) => {
            return await PerformRollAction.badassRoll(html, options);
          }
        }
      }
    }).render(true);
  }
  
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

    if (check.nonRolled) return; // Special case for movement, since I (potentially foolishly) bundled it with checks.
    if (dataset.checkType.toLowerCase() === 'initiative') {
      return actor.rollInitiative({createCombatants: true});
    }

    return await this._makeCheck(event, {
      actor: actor,
      checkDetails: {
        checkTitle: `${dataset.checkType} Check`,//`${actor.system[check.stat].label} Check`,
        bonusesTitle: `${dataset.checkType} Roll Bonuses`,
        checkType: {
          super: dataset.checkType,
          rollType: dataset.rollType,
        },
        showDifficulty: true,
        defaultDifficulty: defaultDifficulty,
        check: check,
        promptCheckType: (dataset.rollType === 'check'),
      },
      itemId: dataset.itemId,
      renderOptions: { width: 500}
    });
  }

  static async _makeCheck(event, options) {
    // Prep data to access.
    const { actor, checkDetails, renderOptions } = options;

    const templateLocation = 'systems/bunkers-and-badasses/templates/dialog/check-difficulty.html';
    const dialogHtmlContent = await renderTemplate(templateLocation, {
      bonusesTitle: checkDetails.bonusesTitle,
      attributes: actor.system.attributes,
      check: checkDetails.check,
      promptCheckType: checkDetails.promptCheckType ?? false,
      isBadass: actor.system.attributes.badass.rollsEnabled,
      defaultDifficulty: checkDetails.defaultDifficulty,
      showDifficulty: checkDetails.showDifficulty,
      showGearMod: checkDetails.showGearMod,
    });

    this.check = new Dialog({
      title: checkDetails.checkTitle,
      Id: 'check-difficulty',
      content: dialogHtmlContent,
      buttons: {
        'Cancel': {
          label: 'Cancel',
          callback: async (html) => {}
        },
        'Roll': {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: 'Roll',
          callback: async (html) => {
            return await PerformRollAction.skillCheck(html, options);
          }
        }
      }
    }).render(true, renderOptions);
  }

  static async useActionSkill(event, options) {
    // Prep data
    const { actor } = options;
    if (!actor) { return; }

    const itemId = event.currentTarget.closest('.action-skill-use').dataset.itemId;
    const i = actor.items.get(itemId);
    if (!i) { return; }
    const item = await Enricher.enrichItem(i);

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
          label: `Use <i>${item.name}</i>`,
          callback : async (html) => {
            return await OnActionUtil.onActionSkillUse({ html: html, actor: actor, item: item });
          }
        }
      }
    }).render(true);
  }

  static async meleeAttack(event, options) {
    const { actor, dataset } = options;
    const check = actor.system.checks[dataset.checkType.toLowerCase()];
    
    return await this._makeCheck(event, {
      actor: actor,
      checkDetails: {
        checkTitle: `Melee Attack`,
        bonusesTitle: `Melee Attack Bonuses`,
        checkType: {
          super: dataset.checkType,
          rollType: dataset.rollType,
        },
        showDifficulty: false,
        showGearMod: true,
        check: check,
        promptCheckType: false,
      },
      itemId: dataset.itemId
    });
  }

  static async rangedAttack(event, options) {
    const {actor, dataset } = options;
    const item = actor.items.get(dataset.itemId);

    const attackValues = await this._getAttackValues({ actor: actor, item: item });
    const isFavored = await this._isAttackFavored({ actor: actor, item: item });
    const isBadass = actor.system.attributes.badass.rollsEnabled;
    
    const templateLocation = 'systems/bunkers-and-badasses/templates/dialog/attack-confirmation.html';
    const dialogHtmlContent = await renderTemplate(templateLocation, {
      type: "Gun",
      attack: attackValues,
      showGearMod: true,
      showFavored: true,
      favored: isFavored,
      isBadass: isBadass,
    });

    const actionOptions = { actor: actor, item: item, attackDetails: attackValues};

    this.attack = new Dialog({
      title:'Gun Attack',
      Id: 'melee-attack-prompt',
      content: dialogHtmlContent,
      buttons: {
        'Cancel': {
          label: 'Cancel',
          callback: async (html) => {}
        },
        'Attack': {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: 'Roll Attack',
          callback: async (html) => {
            return await PerformRollAction.rangedAttack(html, actionOptions);
          }
        }
      }
    }).render(true);
  }


  static async _getAttackValues(options) {
    const { actor, item } = options;
    
    const toHitStat = await this._toHitStat({ actor: actor, item: item });

    const attackValues = {...actor.system.checks.shooting};
    if (toHitStat != attackValues.stat) {
      attackValues.stat = toHitStat;
      attackValues.total -= attackValues.value;
      attackValues.value = actor.system[toHitStat].value;
      attackValues.total += attackValues.value;
    }
    attackValues.gear = item.system.statMods[toHitStat];

    return attackValues;
  }

  static async _toHitStat(options) {
    const { item } = options;

    // Special logic for a legendary weapon.
    if ((item.system?.special?.overrideType ?? '').toLowerCase() == 'mwbg') {
      return "mst";
    }

    return "acc";
  }

  static async _isAttackFavored(options) {
    const isFavoredType = 
      await this._isAttackFavoredWeaponType(options)
      || await this._isAttackFavoredDamageType(options);
    return isFavoredType;
  }

  static async _isAttackFavoredWeaponType(options) {
    const { actor, item } = options;
    const isFavoredWeaponType = ((item.system?.special?.overrideType !== 'snotgun') 
      ? actor.system.favored[item.system.type.value]
      : (actor.system.favored.sniper || actor.system.favored.shotgun));
    return isFavoredWeaponType;
  }

  static async _isAttackFavoredDamageType(options) {
    const { actor, item } = options;
    const damageTypes = genericUtil.getAllDamageTypes({ includeSpecialTypes: true });

    let isFavoredDamageType = false;
    damageTypes.forEach(damageType => {
      if (actor.system.favored[damageType] && item.system.elements[damageType]?.enabled) {
        isFavoredDamageType = true;
      }
    });
    return isFavoredDamageType;
  }

  static async dealShootingDamage(event, options) {
    const { actor, item, dataset } = options;
    
    const { hits, crits } = dataset;
    const attackType = dataset.attackType;
    const isNat20 = dataset['isNat-20'] == 'true';
    const perHitElements = {
      ...DefaultData.damageTypeEntries({ includeSpecialTypes: false }),
      ...item.system.elements
    };
    const perCritElements = {
      ...DefaultData.damageTypeEntries({ includeSpecialTypes: false }),
      kinetic: { enabled: true, damage: '1d12' }
    };
    const perAttackElements = {
      ...DefaultData.damageTypeEntries({ includeSpecialTypes: false }),
      ...item.system.bonusElements
    };

    const templateLocation = 'systems/bunkers-and-badasses/templates/dialog/damage-confirmation.html';
    const dialogHtmlContent = await renderTemplate(templateLocation, {
      perHitElements: perHitElements,
      perCritElements: perCritElements,
      hits: hits, crits: crits,
      perAttackElements: perAttackElements,
      attackType: attackType,
      isShootingAttack: attackType.toLowerCase() === 'shooting',
      isNat20: isNat20,
    });

    this.damage = new Dialog({
      title: `Roll ${item.name} Damage`,
      Id: 'shooting-attack-prompt',
      content: dialogHtmlContent,
      buttons: {
        'Cancel': {
          label: 'Cancel',
          callback: async (html) => {}
        },
        'Damage': {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: 'Roll Damage',
          callback: async (html) => {
            return await PerformRollAction.dealDamage(html, { actor: actor, item: item, attackType: attackType });
          }
        }
      }
    }).render(true);
  }
  
  static async dealMeleeDamage(event, options) {
    const { actor, item, dataset } = options;
    
    const attackType = dataset.attackType;
    const isNat20 = dataset['isNat-20'] == 'true';
    const doubleDamage = dataset.doubleDamage == 'true';
    const plusOneDice = dataset.plusOneDice == 'true';
    const meleeDice = actor.system.class.meleeDice;
    const perAttackElements = {
      ...DefaultData.damageTypeEntries({ includeSpecialTypes: false }),
      kinetic: { 
        enabled: true,
        damage: plusOneDice 
          ? `${meleeDice} + ${meleeDice}`
          : meleeDice
      },
    }

    const templateLocation = 'systems/bunkers-and-badasses/templates/dialog/damage-confirmation.html';
    const dialogHtmlContent = await renderTemplate(templateLocation, {
      perHitElements: {},
      perCritElements: {},
      hits: 0, crits: 0,
      perAttackElements: perAttackElements,
      attackType: attackType,
      doubleDamage: doubleDamage,
      isMeleeAttack: true,
      isNat20: isNat20,
    });

    this.damage = new Dialog({
      title:'Roll Melee Damage',
      Id: 'melee-attack-prompt',
      content: dialogHtmlContent,
      buttons: {
        'Cancel': {
          label: 'Cancel',
          callback: async (html) => {}
        },
        'Damage': {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: 'Roll Damage',
          callback: async (html) => {
            return await PerformRollAction.dealDamage(html, { actor: actor, item: item, attackType: attackType });
          }
        }
      }
    }).render(true);
  }

  static async dealGrenadeDamage(event, options) {
    const { actor, item, dataset } = options;
    
    const attackType = dataset.attackType;
    const isNat20 = dataset['isNat-20'] == 'true';
    const perAttackElements = {
      ...DefaultData.damageTypeEntries({ includeSpecialTypes: false }),
      ...item.system.elements
    };

    const templateLocation = 'systems/bunkers-and-badasses/templates/dialog/damage-confirmation.html';
    const dialogHtmlContent = await renderTemplate(templateLocation, {
      perHitElements: {},
      perCritElements: {},
      hits: 0, crits: 0,
      perAttackElements: perAttackElements,
      attackType: attackType,
      isNat20: isNat20,
    });

    this.damage = new Dialog({
      title:'Roll Grenade Damage',
      Id: 'grenade-attack-prompt',
      content: dialogHtmlContent,
      buttons: {
        'Cancel': {
          label: 'Cancel',
          callback: async (html) => {}
        },
        'Damage': {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: 'Roll Damage',
          callback: async (html) => {
            return await PerformRollAction.dealDamage(html, { actor: actor, item: item, attackType: attackType });
          }
        }
      }
    }).render(true);
  }

  static async npcAttack(event, options) {
    const { actor } = options;

    const templateLocation = 'systems/bunkers-and-badasses/templates/dialog/npc-attack-confirmation.html';
    const dialogHtmlContent = await renderTemplate(templateLocation, { });

    this.attack = new Dialog({
      title: "Attack",
      Id: "npc-attack-prompt",
      content: dialogHtmlContent,
      buttons: {
        "Cancel" : {
          label : "Cancel",
          callback : async (html) => {}
        },
        "Roll" : {
          label : "Attack!",
          callback : async (html) => {
            return await PerformRollAction.npcAttack(html, { actor: actor });
          }
        }
      }
    }).render(true);
  }

  static async npcAction(event, options) {
    const { actor } = options;
    
    const actionObject = (options?.dataset?.path)
      ? genericUtil.deepFind(actor, options.dataset.path)
      : null;
    
    const shouldDefaultWhisperGM = game.settings.get("bunkers-and-badasses", "npcActionsDefaultWhisper");

    const templateLocation = 'systems/bunkers-and-badasses/templates/dialog/post-npc-action-confirmation.html';
    const dialogHtmlContent = await renderTemplate(templateLocation, {
      actorName: actor.name,
      actionName: actionObject?.name ?? "Action",
      whisperToggleId: `whisper-action-actor-${actor.id}-action-${options.dataset?.path}`,
      defaultWhisperToggleValue: shouldDefaultWhisperGM,
     });

    this.npcActionDialog = new Dialog({
      title: "NPC Action",
      Id: "npc-action-prompt",
      content: dialogHtmlContent,
      buttons: {
        "Cancel" : {
          label : "Cancel",
          callback : async (html) => {}
        },
        "Roll" : {
          icon: '<i class="fas fa-comment-alt"></i>',
          label : "Post",
          callback : async (html) => {
            return PostToChat.npcAction(html, { actor: actor, dataset: options.dataset });
          }
        }
      }
    }).render(true);
  }

}