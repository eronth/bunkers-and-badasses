/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
 export const preloadHandlebarsTemplates = async function() {
  return loadTemplates([

    // Actor partials.
    "systems/bunkers-and-badasses/templates/actor/parts/actor-features.html",
    "systems/bunkers-and-badasses/templates/actor/parts/actor-items.html",
    "systems/bunkers-and-badasses/templates/actor/parts/actor-spells.html",
    "systems/bunkers-and-badasses/templates/actor/parts/actor-builder.html",
    "systems/bunkers-and-badasses/templates/actor/parts/actor-builder-archetype.html",
    "systems/bunkers-and-badasses/templates/actor/parts/actor-builder-class.html",
    "systems/bunkers-and-badasses/templates/actor/parts/actor-experience-bar.html",
    "systems/bunkers-and-badasses/templates/actor/parts/actor-effects.html",
  ]);
};
