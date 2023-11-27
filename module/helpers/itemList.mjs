export class ItemList {
  static getItemDetailsBlockTemplateLocation(detailsTemplateType) {
    switch (detailsTemplateType) {
      case 'archetypeFeat':
        return 'systems/bunkers-and-badasses/templates/actor/parts/item-list-components/item-detail/archetype-feat-item-detail-component.html';
      default:
        return 'systems/bunkers-and-badasses/templates/actor/parts/item-list-components/item-detail/default-item-detail-component.html';
    }
  }
}