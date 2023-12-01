export class ItemList {
  static getItemDetailsBlockTemplateLocation(detailsTemplateType) {
    switch ((detailsTemplateType ?? '').toLowerCase()) {
      case 'grenade mod':
      case 'grenademod':
        return 'systems/bunkers-and-badasses/templates/actor/parts/item-list-components/item-detail/grenade-mod-item-detail-component.html';

      case 'archetype feat':
      case 'archetypefeat':
        return 'systems/bunkers-and-badasses/templates/actor/parts/item-list-components/item-detail/archetype-feat-item-detail-component.html';
      default:
        return 'systems/bunkers-and-badasses/templates/actor/parts/item-list-components/item-detail/default-item-detail-component.html';
    }
  }
}

//     "systems/bunkers-and-badasses/templates/actor/parts/item-list-components/item-detail/gun-item-detail-component.html",
//     "systems/bunkers-and-badasses/templates/actor/parts/item-list-components/item-detail/key-item-detail-component.html",
//     "systems/bunkers-and-badasses/templates/actor/parts/item-list-components/item-detail/potion-item-detail-component.html",
//     "systems/bunkers-and-badasses/templates/actor/parts/item-list-components/item-detail/relic-item-detail-component.html",
//     "systems/bunkers-and-badasses/templates/actor/parts/item-list-components/item-detail/shield-item-detail-component.html",