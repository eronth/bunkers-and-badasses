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
    /// Body tabs
    "systems/bunkers-and-badasses/templates/actor/parts/vh/action-tab.html",
    "systems/bunkers-and-badasses/templates/actor/parts/npc/action-tab.html",
    "systems/bunkers-and-badasses/templates/actor/parts/loot-tab.html",
    "systems/bunkers-and-badasses/templates/actor/parts/vh/builder-tab.html",
    "systems/bunkers-and-badasses/templates/actor/parts/bio-tab.html",
    "systems/bunkers-and-badasses/templates/actor/parts/effects-tab.html",
    /// Action tab components
    "systems/bunkers-and-badasses/templates/actor/parts/vh/action-components/checks-block.html",
    "systems/bunkers-and-badasses/templates/actor/parts/vh/action-components/check.html",
    "systems/bunkers-and-badasses/templates/actor/parts/vh/action-components/hp-display-block.html",
    "systems/bunkers-and-badasses/templates/actor/parts/npc/action-components/action-block.html",
    /// Builder subtabs
    "systems/bunkers-and-badasses/templates/actor/parts/vh/builder-subtabs/level-up-subtab.html",
    "systems/bunkers-and-badasses/templates/actor/parts/vh/builder-subtabs/archetypes-subtab.html",
    "systems/bunkers-and-badasses/templates/actor/parts/vh/builder-subtabs/class-subtab.html",
    "systems/bunkers-and-badasses/templates/actor/parts/vh/builder-subtabs/class-skills-subtab.html",
    /// Builder subtab components
    "systems/bunkers-and-badasses/templates/actor/parts/vh/builder-subtabs/builder-components/favored-weapon-component.html",
    "systems/bunkers-and-badasses/templates/actor/parts/vh/builder-subtabs/builder-components/favored-element-component.html",
    "systems/bunkers-and-badasses/templates/actor/parts/vh/builder-subtabs/builder-components/archetype-component.html",
    "systems/bunkers-and-badasses/templates/actor/parts/vh/builder-subtabs/builder-components/base-hp-component.html",
    /// Item list components
    "systems/bunkers-and-badasses/templates/actor/parts/item-list-components/item-list.html",
    "systems/bunkers-and-badasses/templates/actor/parts/item-list-components/item-list-header.html",
    "systems/bunkers-and-badasses/templates/actor/parts/item-list-components/item-list-component.html",
    "systems/bunkers-and-badasses/templates/actor/parts/item-list-components/item-detail/default-item-detail-component.html",
    "systems/bunkers-and-badasses/templates/actor/parts/item-list-components/item-detail/archetype-feat-item-detail-component.html",
    "systems/bunkers-and-badasses/templates/actor/parts/item-list-components/item-detail/grenade-mod-item-detail-component.html",
    "systems/bunkers-and-badasses/templates/actor/parts/item-list-components/item-detail/gun-item-detail-component.html",
    "systems/bunkers-and-badasses/templates/actor/parts/item-list-components/item-detail/key-item-detail-component.html",
    "systems/bunkers-and-badasses/templates/actor/parts/item-list-components/item-detail/potion-item-detail-component.html",
    "systems/bunkers-and-badasses/templates/actor/parts/item-list-components/item-detail/relic-item-detail-component.html",
    "systems/bunkers-and-badasses/templates/actor/parts/item-list-components/item-detail/shield-mod-item-detail-component.html",
    
    /// Old (to be moved or removed)
    "systems/bunkers-and-badasses/templates/actor/parts/actor-features.html",

    // Item partials
    "systems/bunkers-and-badasses/templates/item/parts/rarity-dropdown.html",
    "systems/bunkers-and-badasses/templates/item/parts/element-selector.html",
    "systems/bunkers-and-badasses/templates/item/parts/element-entry-section.html",
      "systems/bunkers-and-badasses/templates/item/parts/elemental-toggle-indicator.html",
      "systems/bunkers-and-badasses/templates/item/parts/elemental-value-input.html",
    "systems/bunkers-and-badasses/templates/item/parts/gun-type-dropdown.html",
    "systems/bunkers-and-badasses/templates/item/parts/health-type-dropdown.html",
    "systems/bunkers-and-badasses/templates/item/parts/red-text.html",
    "systems/bunkers-and-badasses/templates/item/parts/anointment.html",

    // Dialog partials
    "systems/bunkers-and-badasses/templates/dialog/parts/element-radio-button.html",

    // Chat partials
    "systems/bunkers-and-badasses/templates/chat/info/components/red-text.html",

    // General partials
    "systems/bunkers-and-badasses/templates/general/divided-input.html",
    "systems/bunkers-and-badasses/templates/general/accordion-toggle-icon.html",
    
    // Dropdown pieces
    "systems/bunkers-and-badasses/templates/general/dropdown/dropdown-header.html",
    "systems/bunkers-and-badasses/templates/general/dropdown/item-headers/default-dropdown-header.html",
    "systems/bunkers-and-badasses/templates/general/dropdown/item-headers/archetype-feat-dropdown-header.html",
    "systems/bunkers-and-badasses/templates/general/dropdown/item-headers/action-skill-dropdown-header.html",
    "systems/bunkers-and-badasses/templates/general/dropdown/item-headers/class-skill-dropdown-header.html",
    "systems/bunkers-and-badasses/templates/general/dropdown/dropdown-details.html",

  ]);
};
