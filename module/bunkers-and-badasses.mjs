// Import document classes.
import { BNBActor } from "./documents/actor.mjs";
import { BNBItem } from "./documents/item.mjs";
// Import sheet classes.
import { BNBActorSheet } from "./sheets/actor-sheet.mjs";
import { BNBItemSheet } from "./sheets/item-sheet.mjs";
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { BNB } from "./helpers/config.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function() {
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.bnb = {
    BNBActor: BNBActor,
    BNBItem: BNBItem,
    rollItemMacro
  };
  
  // Add custom constants for configuration.
  CONFIG.BNB = BNB;
  
  // System settings here
  game.settings.register('bunkers-and-badasses', 'usePlayerArmor', {
    name: 'Show Armor Health on VH Sheet',
    hint: 'Vault Hunters will have access to an "armor" health pool and shields can be marked as "armor" type.',
    scope: 'world',
    config: true,
    default: false,
    type: Boolean,
  });

  game.settings.register('bunkers-and-badasses', 'usePlayerBone', {
    name: 'Show Bone Health on VH Sheet',
    hint: 'Vault Hunters will have access to a "bone" health pool and shields can be marked as "bone" type.',
    scope: 'world',
    config: true,
    default: false,
    type: Boolean,
  });

  game.settings.register('bunkers-and-badasses', 'usePlayerEridian', {
    name: 'Show Eridian Health on VH Sheet',
    hint: 'Vault Hunters will have access to a "eridian" health pool and shields can be marked as "eridian" type.',
    scope: 'world',
    config: true,
    default: false,
    type: Boolean,
  });

  game.settings.register('bunkers-and-badasses', 'useNpcBone', {
    name: 'Show Bone Health on NPC Sheet',
    hint: 'NPCs will have access to a "bone" health pool type.',
    scope: 'world',
    config: true,
    default: false,
    type: Boolean,
  });

  game.settings.register('bunkers-and-badasses', 'useNpcEridian', {
    name: 'Show Eridian Health on NPC Sheet',
    hint: 'NPCs will have access to a "Eridian" health pool type.',
    scope: 'world',
    config: true,
    default: false,
    type: Boolean,
  });

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "1d20 + @attributes.badass.rank + @checks.initiative.value + @checks.initiative.misc + @bonus.checks.inititative",
    decimals: 2
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = BNBActor;
  CONFIG.Item.documentClass = BNBItem;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("bunkers-and-badasses", BNBActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("bunkers-and-badasses", BNBItemSheet, { makeDefault: true });

  game.socket.on('show-bm-red-text', async data => {
    const item = data.item;
    const itemSystem = item.system;
    
    const user = game.users.get(game.user.id);
      if (user.isGM) 
      {
      const secretMessageData = {
        user: user,
        flavor: `Secret BM only notes for ${this.actor.name}'s <b>${item.name}</b>`,
        content: itemSystem.redTextEffectBM,
        whisper: game.users.filter(u => u.isGM).map(u => u.id),
        speaker: ChatMessage.getSpeaker(),
      };
      return ChatMessage.create(secretMessageData);
    }
  });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here are a few useful examples:
Handlebars.registerHelper('concat', function() {
  let outStr = '';
  for (let arg in arguments) {
    if (typeof arguments[arg] != 'object') {
      outStr += arguments[arg];
    }
  }
  return outStr;
});

Handlebars.registerHelper('toLowerCase', function(str) {
  return str.toLowerCase();
});

Handlebars.registerHelper('toUpperCase', function(str) {
  return str.toUpperCase();
});

Handlebars.registerHelper('toArray', (...values) => {
  // Omit the Handlebars options object.
  return values.slice(0, values.length - 1);
});

Handlebars.registerHelper('toFavoredElementObject', function(...values) {
  return {label: values[0], favored: values[1]};
});

Handlebars.registerHelper('capitalize', function(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
});

Handlebars.registerHelper('hpTitle', function(str) {
  if (str === "flesh")
    str = "health";
  return str.charAt(0).toUpperCase() + str.slice(1);
});

Handlebars.registerHelper('hpToRecoveryTitle', function(str, doCapitalize) {
  if (str === "flesh")
    str = "regen";
  else if (str === "shield")
    str = "recharge";
  else if (str === "armor")
    str = "repair";
  else if (str === "bone")
    str = "regrow";
  else if (str === "eridian")
    str = "reinvigorate";

  if (doCapitalize)
    return str.charAt(0).toUpperCase() + str.slice(1);
  else
    return str;
});

Handlebars.registerHelper('getBestHealthShade', function(str) {
  if (str === "flesh")
    str = "light";
  else if (str === "shield")
    str = "light";
  else if (str === "armor")
    str = "light";
  else if (str === "bone")
    str = "dark";
  else if (str === "eridian")
    str = "light";
  return str;
});

Handlebars.registerHelper('shortName', function(str) {
  let check = str.toLowerCase();
  if (check === 'submachine gun')
    return 'SMG';
  else if (check === 'combat rifle')
    return 'Rifle';
  else if (check === 'sniper rifle')
    return 'Sniper';
  else if (check === 'rocket launcher')
    return 'RL';
  else
    return str;
});



/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function() {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));
});

Hooks.on("preCreateToken", function (document, data) {
  const actor = document?.actor;
  const actorSystem = actor?.system;
  const protoToken = actor?.prototypeToken;
  
  // Get the Hps values from the actor
  const actorHps = actorSystem.attributes.hps;
  const tokenBars = protoToken?.flags?.barbrawl?.resourceBars;
  const hasTokenLoadedBefore = actorSystem?.attributes?.hasTokenLoadedBefore ?? false;

  // Get the settings values.
  const previousHpsSettings = actorSystem?.attributes?.previousHpsSettings ?? { 
    Flesh: true,
    Shield: true,
    Armor: ((actor.type == 'npc') ? true : false),
    Eridian: false,
    Bone: false
  };
  const currentHpsSettings = {
    Armor: (actor.type == 'npc'
      ? true
      : game.settings.get('bunkers-and-badasses', 'usePlayerArmor')),
    Bone: (actor.type == 'npc' 
      ? game.settings.get('bunkers-and-badasses', 'useNpcBone')
      : game.settings.get('bunkers-and-badasses', 'usePlayerBone')),
    Eridian: (actor.type == 'npc'
      ? game.settings.get('bunkers-and-badasses', 'useNpcEridian')
      : game.settings.get('bunkers-and-badasses', 'usePlayerEridian')),
    Flesh: true,
    Shield: true
  }
  
  // Currently delete doesn't clean these up. Oh well.
  // if (!hasTokenLoadedBefore) {
  //   delete tokenBars.bar1;
  //   delete tokenBars.bar2;
  //   const removeKey = 'flags.barbrawl.resourceBars.-=';
  //   actor.update({ [removeKey+'bar1']: null });
  //   actor.update({ [removeKey+'bar2']: null });
  //   actor.token.update({ [removeKey+'bar1']: null });
  //   actor.token.update({ [removeKey+'bar2']: null });
  // }
  

  for (const [settingName, settingValue] of Object.entries(currentHpsSettings)) {
    const barId = ((settingName === "Shield") 
      ? 'bar2'
      : ((settingName === "Flesh")
        ? 'bar1'
        : `bar${settingName}`));
    // Only toggle on if the setting is different.
    if ((settingValue !== previousHpsSettings[settingName]) || !hasTokenLoadedBefore) {

      if (settingValue && (!previousHpsSettings[settingName] || !hasTokenLoadedBefore)) {

        // turn the hp on only if it is not already on.
        if (tokenBars[barId] == null) {
          // if (actorHps[settingName.toLocaleLowerCase()].value > 0 
          // || actorHps[settingName.toLocaleLowerCase()].max > 0) {
            tokenBars[barId] = {...getBarbrawlBar(barId)};
            const addBarKey = 'flags.barbrawl.resourceBars.'+barId;
            document.updateSource({ [addBarKey]: tokenBars[barId] });
            actor.updateSource({ [addBarKey]: tokenBars[barId] });
            actor.prototypeToken.updateSource({ [addBarKey]: tokenBars[barId] });
          //}
        }
      } else if (!settingValue && (previousHpsSettings[settingName] || !hasTokenLoadedBefore)) {
        // turn the hp off
        delete tokenBars[barId];
        const removeKey = 'flags.barbrawl.resourceBars.-='+barId;
        document.updateSource({ [removeKey]: null });
        actor.updateSource({ [removeKey]: null });
        actor.prototypeToken.updateSource({ [removeKey]: null });
      }

    }
  }

  // Always save settings changes.
  const settingsKey = 'system.attributes.previousHpsSettings';
  actor.update({[settingsKey]: currentHpsSettings});

  // Mark if the token has been loaded before, so we can track first ever load or not.
  if (!hasTokenLoadedBefore) {
    const tokenLoadKey = 'system.attributes.hasTokenLoadedBefore';
    actor.update({[tokenLoadKey]: true});
  }

});

function getBarbrawlBar(barId) {
  return tokenBarbrawlBars[barId];
}
let barbrawlOrder = 0;
const visibleBarDefaults = {
  'position': 'top-outer',
  'otherVisibility': CONST.TOKEN_DISPLAY_MODES.HOVER,
  'ownerVisibility': CONST.TOKEN_DISPLAY_MODES.ALWAYS
};
const tokenBarbrawlBars = {
  'barEridian': {
    'id': 'barEridian',
    'order': barbrawlOrder++,
    'maxcolor': '#ff00ff',
    'mincolor': '#bb00bb',
    'attribute': 'attributes.hps.eridian',
    ...visibleBarDefaults,
  },
  'bar2': { // Shield
    'id': 'bar2',
    'order': barbrawlOrder++,
    'maxcolor': '#24e7eb',
    'mincolor': '#79d1d2',
    'attribute': 'attributes.hps.shield',
    ...visibleBarDefaults
  },
  'barArmor': {
    'id': 'barArmor',
    'order': barbrawlOrder++,
    'maxcolor': '#ffdd00',
    'mincolor': '#e1cc47',
    'attribute': 'attributes.hps.armor',
    ...visibleBarDefaults
  },
  'bar1': { // Flesh
    'id': 'bar1',
    'order': barbrawlOrder++,
    'maxcolor': '#d23232',
    'mincolor': '#a20b0b',
    'attribute': 'attributes.hps.flesh',
    ...visibleBarDefaults
  },
  'barBone': {
    'id': 'barBone',
    'order': barbrawlOrder++,
    'maxcolor': '#bbbbbb',
    'mincolor': '#333333',
    'attribute': 'attributes.hps.bone',
    ...visibleBarDefaults
  }
};




/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  if (data.type !== "Item") return;
  if (!("data" in data)) return ui.notifications.warn("You can only create macro buttons for owned Items");
  const item = data["data"];

  // Create the macro command
  const command = `game.bnb.rollItemMacro("${item.name}");`;
  let macro = game.macros.entities.find(m => (m.name === item.name) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "bnb.itemMacro": true }
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemName
 * @return {Promise}
 */
async function rollItemMacro(itemName) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  const item = actor ? actor.items.find(i => i.name === itemName) : null;
  if (!item) return ui.notifications.warn(`Your controlled Actor does not have an item named ${itemName}`);

  // Trigger the item roll
  return await item.roll({async: true});
}


/* -------------------------------------------- */
/*  Chat Hooks                                  */
/* -------------------------------------------- */
Hooks.on('renderChatMessage', (app, html, data) => {
})
Hooks.on('renderChatLog', (app, html, data) => {
  BNBItem.addChatListeners(html);
  BNBActor.addChatListeners(html);
});
Hooks.on('renderChatPopout', (app, html, data) => {
  BNBItem.addChatListeners(html);
  BNBActor.addChatListeners(html);
});