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
    const system = duplicate(header.dataset);
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

  static onItemDelete(event, actor, render) {
    event.stopPropagation();
    const li = $(event.currentTarget).parents(".item-element-group");
    const item = actor.items.get(li.data("itemId"));
    item.delete();
    li.slideUp(200, () => render(false));
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

  static async onActionSkillUse(event, actor) {
    // Prep data
    const itemId = event.currentTarget.closest('.action-skill-use').dataset.itemId;
    const item = actor.items.get(itemId);

    if (!item) { return; }

    // Prep chat values.
    const templateLocation = `systems/bunkers-and-badasses/templates/chat/info/action-skill-info.html`;
    const renderTemplateConfig = {
      actorId: actor.id,
      description: item.system.description,
      item: item
    };
    const content = await renderTemplate(templateLocation, renderTemplateConfig);
    const flavorText = `${actor.name} uses <b>${item.name}</b>.`;
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: flavorText,
      type: CONST.CHAT_MESSAGE_TYPES.IC,
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u.id)
      speaker: ChatMessage.getSpeaker(),
      content: content,
    }

    // Send the roll to chat!
    return ChatMessage.create(messageData);
  }

  static async onArchetypeRewardCollapseToggle(event, actor) {
    // Prep data
    const archetypeNum = event.currentTarget.dataset.archetypeNumber;
    const archetype = actor.system.archetypes["archetype" + archetypeNum];

    // Square brackets needed to get the right value.
    const attributeLabel = `system.archetypes.archetype${archetypeNum}.rewardsAreCollapsed`;
    return await actor.update({[attributeLabel]: !archetype.rewardsAreCollapsed});
  }

  static async onSkillTierCollapseToggle(event, actor) {
    // Prep data
    const skillTier = event.currentTarget.dataset.skillTier;
    const collapsed = actor.system.class.skillsAreCollapsed['Tier'+skillTier];

    // Square brackets needed to get the right value.
    const attributeLabel = `system.class.skillsAreCollapsed.${'Tier'+skillTier}`;
    return await actor.update({[attributeLabel]: !collapsed});
  }

  static async onLootCategoryCollapseToggle(event, actor) {
    // Prep data
    const collapseCategory = event.currentTarget.dataset.collapseCategoryType;
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
}