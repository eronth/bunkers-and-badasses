export class ItemList {
  static getItemDetailsBlockTemplateLocation(detailsTemplateType) {
    switch ((detailsTemplateType ?? '').toLowerCase()) {
      case 'shield mod':
      case 'shieldmod':
      case 'shield':
        return 'systems/bunkers-and-badasses/templates/actor/parts/item-list-components/item-detail/shield-mod-item-detail-component.html';
      case 'grenade mod':
      case 'grenademod':
      case 'grenade':
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