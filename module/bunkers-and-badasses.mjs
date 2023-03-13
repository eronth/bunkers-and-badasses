// Import document classes.
import { BNBActor } from "./documents/actor.mjs";
import { BNBItem } from "./documents/item.mjs";
// Import sheet classes.
import { BNBActorSheet } from "./sheets/actor-sheet.mjs";
import { BNBItemSheet } from "./sheets/item-sheet.mjs";
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { BNB } from "./helpers/config.mjs";
import { BarbrawlBuilder } from "./helpers/barbrawl-builder.mjs";
import { HandlebarsHelperUtil } from "./helpers/handlebarsHelperUtil.mjs";

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

  game.settings.register('bunkers-and-badasses', 'measurementType', {
    name: 'Distance Measurement Style',
    hint: 'Choose between several different methods for distance measurements. For now, "Measurement Controls" and "Exact (Rounded Up)" function the exact same way.',
    scope: 'world',
    config: true,
    default: 'simple',
    type: String,
    choices: {
      'simple': 'Simple (Default) — Calculate diagonals as 1 sq',
      'manhattan': 'Manhattan — Treat diagonals as 2 sq',
      'everyOther': 'Every Other - Every even number diagonal counts as 2 sq instead of 1 sq',
      'measureControls': "Measurement Controls - Attempts to match Foundry VTT's Measurement Controls",
      'exactRound': 'Exact (Rounded) — Use exact distances, round to nearest whole number',
      'exactRoundUp': 'Exact (Rounded Up) — Use exact distances, round up',
      'exactRoundDown': 'Exact (Rounded Down) — Use exact distances, round down',
      'exactDecimal': 'Exact (Decimal) — Use exact distances, show decimal places'
    }
  });
  
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
HandlebarsHelperUtil.prepareHandlebarsHelpers();

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function() {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));
});

Hooks.once('libWrapper.Ready', async () => {
  libWrapper.register('bunkers-and-badasses', 'Ruler.prototype._computeDistance', computeBnBDistance, libWrapper.MIXED);
});

function computeBnBDistance(wrapper, gridSpaces) {
  const measureType = game.settings.get('bunkers-and-badasses', 'measurementType');

  if (measureType === 'simple') { return wrapper(gridSpaces); }

  let totalDistance = 0;
  const lastSegmentKey = this.segments.length - 1;

  this.segments.forEach((segment, key) => {
    const sideX = Math.abs(segment.ray.A.x - segment.ray.B.x);
    const sideY = Math.abs(segment.ray.A.y - segment.ray.B.y);

    const addedDistance = getAddedDistance({ line: { X: sideX, Y: sideY } });

    segment.last = (key === lastSegmentKey);
    segment.distance = addedDistance;
    totalDistance += addedDistance;
    segment.text = this._getSegmentLabel(segment, totalDistance);
  });
}

function getAddedDistance({ line }) {
  const measureType = game.settings.get('bunkers-and-badasses', 'measurementType');
  const { X, Y } = line;
  const { size, distance } = canvas.scene.dimensions;
  const gridConversion = distance / size;

  if (measureType === 'manhattan') {
    return (Math.abs(X) + Math.abs(Y)) * gridConversion;
  } else if (measureType === 'everyOther') {
    const straightCount = Math.max(X * gridConversion, Y * gridConversion);
    const diagonalCount = Math.min(X * gridConversion, Y * gridConversion);
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
    const barId = `bar${settingName}`;
    
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
const tokenBarbrawlBars = {
  ...(BarbrawlBuilder._buildBarbrawlBars( {useAllHealth: true} ))
};

Hooks.once("dragRuler.ready", (SpeedProvider) => {
  class BnBSpeedProvider extends SpeedProvider {
    get colors() {
      return [
        { id: 'movement', default: 0x00ff00, name: 'Movement' },
        { id: 'extraMovement', default: 0xfff700, name: 'Extra Movement' },
        { id: 'extraMovement2', default: 0xcc20df, name: 'More Extra Movement' },
        { id: 'frozen', default: 0x1298b9, name: 'Frozen Movement' },
        { id: 'frozenExtraMovement', default: 0x5dcce8, name: 'Frozen Extra Movement' }
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
        .map((ef) => ef.label)
        .concat(actorEffects);

      const isFroze = ([].concat(actorEffects, tokenEffects)).some(i => i === 'Frozen');

      const ranges = (isFroze) 
      ? [ frozen, frozenExtraMovement ]
      : [ movement, extraMovement, extraMovement2 ];

      return ranges;
    }
  }

  dragRuler.registerSystem("bunkers-and-badasses", BnBSpeedProvider);
})


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