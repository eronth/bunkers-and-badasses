/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
 export const preloadHandlebarsTemplates = async function() {
  return loadTemplates([

    // Actor partials.
    "systems/bunkers-and-badasses/templates/actor/parts/actor-experience-bar.html",
    "systems/bunkers-and-badasses/templates/actor/parts/actor-bio.html",
    "systems/bunkers-and-badasses/templates/actor/parts/actor-features.html",
    "systems/bunkers-and-badasses/templates/actor/parts/actor-loot.html",
    "systems/bunkers-and-badasses/templates/actor/parts/actor-effects.html",

    "systems/bunkers-and-badasses/templates/actor/parts/actor-vault-hunter-action.html",
    "systems/bunkers-and-badasses/templates/actor/parts/action-components/checks-block.html",
    "systems/bunkers-and-badasses/templates/actor/parts/action-components/check.html",
    "systems/bunkers-and-badasses/templates/actor/parts/action-components/hp-display-block.html",

    "systems/bunkers-and-badasses/templates/actor/parts/actor-npc-header-stats.html",

    "systems/bunkers-and-badasses/templates/actor/parts/actor-npc-action.html",
    "systems/bunkers-and-badasses/templates/actor/parts/action-components/npc-action.html",

    "systems/bunkers-and-badasses/templates/actor/parts/actor-builder.html",
    "systems/bunkers-and-badasses/templates/actor/parts/builder-components/actor-builder-levelup.html",
    "systems/bunkers-and-badasses/templates/actor/parts/builder-components/actor-builder-archetypes.html",
    "systems/bunkers-and-badasses/templates/actor/parts/builder-components/actor-builder-individual-archetype.html",
    "systems/bunkers-and-badasses/templates/actor/parts/builder-components/actor-builder-class.html",
    "systems/bunkers-and-badasses/templates/actor/parts/builder-components/actor-builder-class-skills.html",

    "systems/bunkers-and-badasses/templates/item/parts/rarity-dropdown.html",
    "systems/bunkers-and-badasses/templates/item/parts/element-selector.html",
    "systems/bunkers-and-badasses/templates/item/parts/damage-entry.html",
    "systems/bunkers-and-badasses/templates/item/parts/element-entry-section.html",
    "systems/bunkers-and-badasses/templates/item/parts/gun-type-dropdown.html",
    "systems/bunkers-and-badasses/templates/item/parts/red-text.html",

    "systems/bunkers-and-badasses/templates/dialog/parts/element-radio-button.html"
  ]);
};
