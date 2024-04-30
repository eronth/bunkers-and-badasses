// Import document classes.
import { BNBActor } from "./documents/actor.mjs";
import { BNBItem } from "./documents/item.mjs";
import { BNBCombatant } from "./documents/combatant.mjs";
// Import sheet classes.
import { BNBActorSheet } from "./sheets/actor-sheet.mjs";
import { BNBItemSheet } from "./sheets/item-sheet.mjs";
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { BNB } from "./helpers/config.mjs";
import { BarbrawlBuilder } from "./helpers/barbrawl-builder.mjs";
import { HandlebarsHelperUtil } from "./helpers/handlebarsHelperUtil.mjs";
import ResourceTracker from "./floating-tool/ResourceTracker.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function() {
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.bnb = {
    BNBActor: BNBActor,
    BNBItem: BNBItem,
    rollItemMacro,
    ResourceTracker,
  };
  game.tracker = new game.bnb.ResourceTracker();
  game.socket.on("system.bunkers-and-badasses", async data => {
    // if (data.type == "setCounter" && game.user.isGM) {
    //   game.settings.set("bunkers-and-badasses", data.payload.type, data.payload.value)
    // } else if (data.type == "setTrackedResourceCounters" && game.user.isGM) {
    //   game.settings.set("bunkers-and-badasses", "trackedResourceCounters", data.payload)
    // }
  });
  
  // Add custom constants for configuration.
  CONFIG.BNB = BNB;
  CONFIG.Dice.legacyParsing = true;

  game.settings.register('bunkers-and-badasses', 'measurementType', {
    name: 'Distance Measurement Style',
    hint: 'Choose between several different methods for distance measurements. For now, "Measurement Controls" and "Euclid (Rounded Up)" function the exact same way.',
    scope: 'world',
    config: true,
    default: 'simple',
    type: String,
    choices: {
      'simple': 'Simple (Default) — Calculate diagonals as 1 sq',
      'manhattan': 'Manhattan — Treat diagonals as 2 sq',
      'everyOther': 'Approximation - Every even number diagonal counts as 2 sq instead of 1 sq',
      'measureControls': "Measurement Controls - Attempts to match Foundry VTT's Measurement Controls",
      'exactRound': 'Euclid (Rounded) — Use exact distances, round to nearest whole number',
      'exactRoundUp': 'Euclid (Rounded Up) — Use exact distances, round up',
      'exactRoundDown': 'Euclid (Rounded Down) — Use exact distances, round down',
      //'exactDecimal': 'Euclid (Decimal) — Use exact distances, show decimal places'
    }
  });
  
  ////////////////////////////
  //  System settings here  //
  ////////////////////////////
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

  //////////////////////////////
  //  Hidden settings/values  //
  //////////////////////////////
  game.settings.register('bunkers-and-badasses', 'resourceTrackerToolPosition', {
    name: 'Resource Tracker Tool Position',
    scope: 'client',
    config: false,
    default: {},
    type: Object,
  });

  game.settings.register('bunkers-and-badasses', 'trackedResources', {
    name: 'Tracked Resource',
    scope: 'world',
    config: false,
    default: [{
      name: 'Mayhem',
      value: 0,
      playersCanSee: true,
      playersCanEdit: false,
    }],
    type: Array,
  });

  /**
   * Set an initiative formula for the system
   * This is a default, just in case. Intent is to override 
   * this for each actor type.
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "1d20",
    decimals: 2
  };

  CONFIG.Combatant.documentClass = BNBCombatant;

  // Define custom Document classes
  CONFIG.Actor.documentClass = BNBActor;
  CONFIG.Item.documentClass = BNBItem;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("bunkers-and-badasses", BNBActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("bunkers-and-badasses", BNBItemSheet, { makeDefault: true });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */
HandlebarsHelperUtil.prepareHandlebarsHelpers();

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */
Hooks.once("ready", async function() {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));
});

Hooks.on('canvasInit', (gameCanvas) => {
  SquareGrid.prototype.measureDistances = measureBnBDistances;
});

function measureBnBDistances(segments, options) {
  const measureType = game.settings.get('bunkers-and-badasses', 'measurementType');
  
  if (measureType === 'simple') return BaseGrid.prototype.measureDistances.call(this, segments, options);
  if (!options.gridSpaces) return BaseGrid.prototype.measureDistances.call(this, segments, options);
  if (!segments || !segments.length) return [];

  const { size, distance } = canvas.scene.dimensions;
  const gridConversion = distance / size;

  let leftoverDiagonal = 0; // Used for every other

  return segments.map((segment, key) => {
    const sideX = Math.abs(segment.ray.A.x - segment.ray.B.x);
    const sideY = Math.abs(segment.ray.A.y - segment.ray.B.y);
    const distance = getAddedDistance({ line: { X: sideX, Y: sideY }, leftoverDiagonal: leftoverDiagonal, gridConversion: gridConversion});
    leftoverDiagonal = (leftoverDiagonal + Math.min(sideX * gridConversion, sideY * gridConversion)) % 2;
    return distance;
  });
}

function getAddedDistance({ line, leftoverDiagonal, gridConversion }) {
  const measureType = game.settings.get('bunkers-and-badasses', 'measurementType');
  const { X, Y } = line;
  if (measureType === 'manhattan') {
    return (Math.abs(X) + Math.abs(Y)) * gridConversion;
  } else if (measureType === 'everyOther') {
    const straightCount = Math.max(X * gridConversion, Y * gridConversion);
    const diagonalCount = Math.min(X * gridConversion, Y * gridConversion) + leftoverDiagonal;
    return (straightCount + Math.floor((diagonalCount / 2)));
  } else if (measureType === 'exactDecimal') {
    return Math.sqrt(Math.pow(X, 2) + Math.pow(Y, 2)) * gridConversion;
  } else if (measureType === 'exactRound') {
    return Math.round(Math.sqrt(Math.pow(X, 2) + Math.pow(Y, 2)) * gridConversion);
  } else if (measureType === 'exactRoundDown') {
    return Math.floor(Math.sqrt(Math.pow(X, 2) + Math.pow(Y, 2)) * gridConversion);
  } else if (measureType === 'exactRoundUp' || measureType === 'measureControls') {
    return Math.ceil(Math.sqrt(Math.pow(X, 2) + Math.pow(Y, 2)) * gridConversion);
  }
}

// Keeping this around for future debug use...
// Hooks.on('updateActor', (log1, log2, log3, log4) => {
//   console.log(log1);
//   console.log(log2.system.actions);
// });

Hooks.on('preCreateToken', (document, data) => {
  const actor = document.actor;
  const isNpc = actor.type == 'npc';
  
  const resourceFlags = {
    armor: (isNpc ? true : game.settings.get('bunkers-and-badasses', 'usePlayerArmor')),
    bone: game.settings.get('bunkers-and-badasses', (isNpc ? 'useNpcBone' : 'usePlayerBone')),
    eridian: game.settings.get('bunkers-and-badasses', (isNpc ? 'useNpcEridian' : 'usePlayerEridian')),
    flesh: true,
    shield: true
  };

  const resourceBars = BarbrawlBuilder.buildResourceBars({ resourceFlags: resourceFlags});
  document.updateSource({ 'flags.barbrawl.resourceBars': resourceBars });
});

Hooks.once("dragRuler.ready", (SpeedProvider) => {
  class BnBSpeedProvider extends SpeedProvider {
    get colors() {
      return [
        { id: 'movement', default: 0x00ff00, name: 'Movement' },
        { id: 'extraMovement', default: 0xfff700, name: 'Extra Movement' },
        { id: 'extraMovement2', default: 0xcc20df, name: 'More Extra Movement' },
        { id: 'frozen', default: 0x5dcce8, name: 'Frozen Movement' },
        { id: 'frozenExtraMovement', default: 0x9998b9, name: 'Frozen Extra Movement' }
      ]
    }

    getRanges(token) {
      const baseSpeed = (token.actor.type=='npc') 
        ? Math.max.apply(Math, Object.values(token.actor.system.movements).map((m) => m.distance ))
        : token.actor.system.checks.movement.total;
      const movement = { range: baseSpeed, color: 'movement' };
      const extraMovement = { range: baseSpeed * 2, color: 'extraMovement' };
      const extraMovement2 = { range: baseSpeed * 3, color: 'extraMovement2' };
      const frozen = { range: 1, color: 'frozen' };
      const frozenExtraMovement = { range: 2, color: 'frozenExtraMovement' };

      // Try to determine if a character is considered "Frozen".
      const actorEffects = (token?.actor?.effects || [])
        .filter((eff) => (!eff.disabled && !eff.isSuppressed))
        .map((eff) => eff.label);
      const tokenData = token.document ? token.document : token;
      const tokenEffects = (tokenData?.effects || [])
        .filter((ef) => !ef.disabled && !ef.isSuppressed)
        .map((ef) => ef.label);

      const isFroze = ([].concat(actorEffects, tokenEffects)).some(i => i === 'Frozen');

      const ranges = (isFroze) 
      ? [ frozen, frozenExtraMovement ]
      : [ movement, extraMovement, extraMovement2 ];

      return ranges;
    }
  }

  dragRuler.registerSystem("bunkers-and-badasses", BnBSpeedProvider);
})

Hooks.on("item-piles-ready", async () => {

  const columns = [
    {
      label: "Type",
      path: "system.type.name",
      formatting: "{#}",
      mapping: { }
    },
    {
      label: "Rarity",
      path: "system.rarity.name",
      formatting: "{#}",
      mapping: { }
    },
    {
      label: "Guild",
      path: "system.guild",
      formatting: "{#}",
      mapping: { }
    }
  ];

  game.itempiles.API.addSystemIntegration({
    VERSION: "1.0.0",
    ACTOR_CLASS_TYPE: "npc",
    ITEM_QUANTITY_ATTRIBUTE: "system.quantity",
    ITEM_PRICE_ATTRIBUTE: "system.cost",
    ITEM_FILTERS: [
      {
        path: "type",
        filters: "feature,skill,Archetype Level,Archetype Feat,Action Skill"
      }
    ],
    PILE_DEFAULTS: {
      //pileColumns: [...columns],
      //containerColumns: [...columns],
      merchantColumns: [...columns],
      //vaultColumns: [...columns],
    },
    UNSTACKABLE_ITEM_TYPES: ["gun", "shield", "grenade", "relic"],
    ITEM_SIMILARITIES: ["name", "type", "system.guild.name", "system.type.name", "system.rarity.name"],
    CURRENCIES: [
      {
        type: "attribute",
        name: "Gold",
        img: "icons/commodities/currency/coins-plain-stack-gold.webp",
        abbreviation: "{#} G",
        data: {
          path: "system.gold"
        },
        primary: true,
        exchangeRate: 1
      },
      {
        type: "attribute",
        name: "Grenades",
        img: "icons/weapons/thrown/bomb-fuse-black.webp",
        abbreviation: "{#} 'Nades",
        data: {
          path: "system.attributes.grenades.value"
        },
        primary: false,
        exchangeRate: 1
      }
    ],
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
  return await item.roll();
}


/* -------------------------------------------- */
/*  Chat Hooks                                  */
/* -------------------------------------------- */
Hooks.on('renderChatMessage', (app, html, data) => {
  if (!game.user.isGM) {
    html.find('.gm-secret').remove();
  }
});
Hooks.on('renderChatLog', (app, html, data) => {
  BNBItem.addChatListeners(html);
  BNBActor.addChatListeners(html);
});
Hooks.on('renderChatPopout', (app, html, data) => {
  BNBItem.addChatListeners(html);
  BNBActor.addChatListeners(html);
});