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
  
  // System settings here?
  game.settings.register('bunkers-and-badasses', 'usePlayerArmor', {
    name: 'Show Armor on Player Sheet',
    hint: 'Players will have access to an armor health pool.',
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
    formula: "1d20 + @attributes.badass.rank + @checks.initiative.value + @checks.initiative.bonus",
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
    var test = data;
    const flavorText = `MESSAGE`;
    const messageData = {
      user: game.user._id,
      //speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: flavorText,
      type: CONST.CHAT_MESSAGE_TYPES.IC,
      content: "just some basic text",
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u._id)
      //speaker: ChatMessage.getSpeaker(),
    }

    // Send the roll to chat!
    return await ChatMessage.create(messageData);
  });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here are a few useful examples:
Handlebars.registerHelper('concat', function() {
  var outStr = '';
  for (var arg in arguments) {
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

  if (doCapitalize)
    return str.charAt(0).toUpperCase() + str.slice(1);
  else
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
  game.socket.on('show-bm-red-text', async data => {
    var test = data;
    
    const flavorText = `MESSAGE`;
    const messageData = {
      user: game.user._id,
      //speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: flavorText,
      type: CONST.CHAT_MESSAGE_TYPES.IC,
      content: "just some basic text",
      // whisper: game.users.entities.filter(u => u.isGM).map(u => u._id)
      //speaker: ChatMessage.getSpeaker(),
    }
    
    // Send the roll to chat!
    return await ChatMessage.create(messageData);
  });
  
});

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
  const item = data.data;

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
function rollItemMacro(itemName) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  const item = actor ? actor.items.find(i => i.name === itemName) : null;
  if (!item) return ui.notifications.warn(`Your controlled Actor does not have an item named ${itemName}`);

  // Trigger the item roll
  return item.roll();
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