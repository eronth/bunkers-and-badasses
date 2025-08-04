import { DefaultData } from "./defaultData.mjs";
import { PostToChat } from "./roll-and-post/postToChat.mjs";

export class OnActionUtil {
  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  static async onItemCreate(event, actor) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.dtype;
    // Grab any data associated with this control.
    const system = foundry.utils.duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: system,
    };

    if (type==='Archetype Feat') {
      itemData.img = 'icons/svg/combat.svg';
    } else if (type==='Action Skill') {
      itemData.img = 'icons/svg/clockwork.svg';
    } else if (type==='skill') {
      itemData.img = 'icons/svg/oak.svg';
    } else if (type==='Archetype Level') {
      itemData.img = 'icons/svg/upgrade.svg';
      itemData.system.archetypeNumber = header.dataset.archetypeNumber;
      itemData.system.level = ((Number)(header.dataset.archetypeCount))+1;
    }

    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system["type"];

    // Finally, create the item!
    return await Item.create(itemData, {parent: actor});
  }

  static onItemEdit(event, actor) {
    event.stopPropagation();
    const li = $(event.currentTarget).parents(".item-element-group");
    const item = actor.items.get(li.data("itemId"));
    item.sheet.render(true);
  }

  static onItemDelete(html, options) {
    const { actor, item, li, inRender } = options;
    item.delete();
    //li.slideUp(200, () => inRender(false));
  }

  static onItemCheckbox(event, actor) {
    event.stopPropagation();

    let target = $(event.currentTarget).attr("data-target")
    if (target == "item") {
      target = $(event.currentTarget).attr("data-item-target")
      const item = actor.items.get($(event.currentTarget).parents(".item").attr("data-item-id"))
      return item.update({ [`${target}`]: !getProperty(item.system, target) })
    }
    if (target)
      return actor.update({[`${target}`] : !getProperty(actor.system, target)});
  }

  static onCheckboxClick(event, actor) {
    let target = $(event.currentTarget).attr("data-target")
    if (target == "item") {
      target = $(event.currentTarget).attr("data-item-target")
      let item = actor.items.get($(event.currentTarget).parents(".item").attr("data-item-id"))
      return item.update({ [`${target}`]: !getProperty(item, target) })
    }
    if (target)
      return actor.update({[`${target}`] : !getProperty(actor, target)});
  }

  static async onActionSkillUse(options) {
    const { actor, item, html } = options;
    const freeActivation = (html.find("#free-activation")[0].checked);
    
    if (!freeActivation) {
      let newUses = actor.system.class.actionSkill.uses.value - 1;
      if (newUses < 0) { 
        ui.notifications.warn(`You don't have enough remaining Action Skill uses to activate ${item.name}!`);
        return;
      }
      await actor.update({'system.class.actionSkill.uses.value': newUses});
    }

    return await PostToChat.useActionSkill({ actor: actor, item: item });
  }

  static async onArchetypeRewardCollapseToggle(event, actor) {
    // Prep data
    const archetypeNum = event.currentTarget.dataset.archetypeNumber;
    const archetype = actor.system.archetypes["archetype" + archetypeNum];

    // Square brackets needed to get the right value.
    const attributeLabel = `system.archetypes.archetype${archetypeNum}.rewardsAreCollapsed`;
    return await actor.update({[attributeLabel]: !archetype.rewardsAreCollapsed});
  }

  static async onCategoryCollapseToggle(event, actor) {
    // Prep data
    const collapseCategory = event.currentTarget.dataset.collapseCategoryType;
    const collapsed = actor.system.isCollapsed[collapseCategory];

    // Square brackets needed to get the right value.
    const attributeLabel = `system.isCollapsed.${collapseCategory}`;
    return await actor.update({[attributeLabel]: !collapsed});
  }

  static async onDisplaySkillCalculationsToggle(event, actor) {
    // Prep data
    const collapseCategory = "skillCalculations";
    const collapsed = actor.system.isCollapsed[collapseCategory];

    // Square brackets needed to get the right value.
    const attributeLabel = `system.isCollapsed.${collapseCategory}`;
    return await actor.update({[attributeLabel]: !collapsed});
  }

  // I wanted these to be automatic, but it was just straight up not working.
  // Instead, I will just make the players manually update their archetype levels.
  static async onOldArchetypeRewardUpgrade(event, actor) {
    // Pull data from event.
    const archetypeNum = event.currentTarget.dataset.archetypeNumber;
    const rewardIndex = event.currentTarget.dataset.rewardIndex;
    const archetype = actor.system.archetypes["archetype" + archetypeNum];
    const reward = archetype.rewards[rewardIndex];
    
    // Prep sepcific data for saving.
    const itemSystemData = {
      archetypeNumber: archetypeNum,
      level: reward?.Level ?? 0,
      bonus: reward?.Description,
      description: reward?.Description,
    };
    // Prepare item base data.
    const newArchetypeLevelData = {
      name: 'New Archetype Level',
      type: "Archetype Level",
      img: 'icons/svg/upgrade.svg',
      system: {...itemSystemData}
    };

    // Create item for use.
    const newArchetypeLevelItem = await Item.create(newArchetypeLevelData, { parent: actor });
    this.onOldArchetypeRewardDelete(event, actor);
  }

  static async onOldArchetypeRewardDelete(event, actor) {
    // Pull data from event.
    const archetypeNum = event.currentTarget.dataset.archetypeNumber;
    const rewardIndex = event.currentTarget.dataset.rewardIndex;
    const archetype = actor.system.archetypes["archetype" + archetypeNum];
    
    // Prep data for saving.
    archetype.rewards.splice(rewardIndex, 1);
    
    // Square brackets needed to get the right value.
    actor.update({["system.archetypes.archetype"+archetypeNum+".rewards"]: archetype.rewards});
  }

  static async onNpcActionCreate(event, actor) {
    // Prep data
    const actionType = event.currentTarget.dataset.actionType;
    const actionList = actor.system.actions[actionType].actionList ?? {};
    const nextIndex = Object.keys(actionList).length.toString();
    actionList[nextIndex] = { ...DefaultData.npcAction() };

    // Create the item.
    actor.update({["system.actions."+actionType+".actionList"]: actionList});
  }

  static async onNpcActionDelete(html, options) {
    // Prep data
    const { actor, actionType, actionIndex } = options;
    const actionList = actor.system.actions[actionType].actionList ?? {};
    const newActionList = {};

    // Iterate all actions, skipping the one to delete.
    // This allows the numbering to remain consistent.
    let i = 0;
    for (let key in actionList) {
      if (key === actionIndex) {
        // Skip.
      } else {
        newActionList[i.toString()] = actionList[key];
        i++;
      }
    }
    
    // Update the actor.
    await actor.update({["system.actions."+actionType+".-=actionList"]: null});
    await actor.update({["system.actions."+actionType+".actionList"]: newActionList});
  }
}