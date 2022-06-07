/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
 export const preloadHandlebarsTemplates = async function() {
  return loadTemplates([

    // Actor partials
    /// Header Components
    "systems/bunkers-and-badasses/templates/actor/parts/vh/header/experience-bar.html",
    "systems/bunkers-and-badasses/templates/actor/parts/vh/header/healths-block.html",
    "systems/bunkers-and-badasses/templates/actor/parts/vh/header/stats-block.html",
    "systems/bunkers-and-badasses/templates/actor/parts/npc/header/stats.html",
    
    /// Body Components
    "systems/bunkers-and-badasses/templates/actor/parts/vh/action.html",
    "systems/bunkers-and-badasses/templates/actor/parts/npc/action.html",
    "systems/bunkers-and-badasses/templates/actor/parts/loot.html",
    "systems/bunkers-and-badasses/templates/actor/parts/vh/builder.html",
    "systems/bunkers-and-badasses/templates/actor/parts/bio.html",
    "systems/bunkers-and-badasses/templates/actor/parts/effects.html",
    
    /// Action components
    "systems/bunkers-and-badasses/templates/actor/parts/vh/action-components/checks-block.html",
    "systems/bunkers-and-badasses/templates/actor/parts/vh/action-components/check.html",
    "systems/bunkers-and-badasses/templates/actor/parts/vh/action-components/hp-display-block.html",
    "systems/bunkers-and-badasses/templates/actor/parts/npc/action-components/action-block.html",
    /// Builder components
    
    /// Old (to be moved)
    "systems/bunkers-and-badasses/templates/actor/parts/actor-features.html",




    "systems/bunkers-and-badasses/templates/actor/parts/builder-components/actor-builder-levelup.html",
    "systems/bunkers-and-badasses/templates/actor/parts/builder-components/favored-element-component.html",
    "systems/bunkers-and-badasses/templates/actor/parts/builder-components/actor-builder-archetypes.html",
    "systems/bunkers-and-badasses/templates/actor/parts/builder-components/actor-builder-individual-archetype.html",
    "systems/bunkers-and-badasses/templates/actor/parts/builder-components/actor-builder-class.html",
    "systems/bunkers-and-badasses/templates/actor/parts/builder-components/actor-builder-class-skills.html",

    // Item partials
    "systems/bunkers-and-badasses/templates/item/parts/rarity-dropdown.html",
    "systems/bunkers-and-badasses/templates/item/parts/element-selector.html",
    "systems/bunkers-and-badasses/templates/item/parts/damage-entry.html",
    "systems/bunkers-and-badasses/templates/item/parts/element-entry-section.html",
    "systems/bunkers-and-badasses/templates/item/parts/gun-type-dropdown.html",
    "systems/bunkers-and-badasses/templates/item/parts/health-type-dropdown.html",
    "systems/bunkers-and-badasses/templates/item/parts/red-text.html",

    "systems/bunkers-and-badasses/templates/dialog/parts/element-radio-button.html"
  ]);
};
