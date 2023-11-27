export class ItemList {
  static getItemDetailsBlockTemplateLocation(detailsTemplateType) {
    switch (detailsTemplateType) {
      default:
        return 'systems/bunkers-and-badasses/templates/actor/parts/item-list-components/item-detail/default-item-detail-component.html';
    }
  }
}