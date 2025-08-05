import { Enricher } from './enricher.mjs';
import { RenderTemplate } from './foundryAccessHelper.mjs';

export class Dropdown {
  static getComponentClass(componentType) {
    switch (componentType) {
      case 'header': return 'item-dropdown-header';
      case 'body': return 'item-dropdown-body';
      case 'group': return 'item-dropdown-group';
      case 'clickable': return 'item-dropdown-click-component';
      case 'hr': return 'item-dropdown-hr';

      default: return 'MISSING-DROPDOWN-PARAM';
    };
  }
  static getComponentCss(componentType) {
    switch (componentType) {
      case 'header': return '';
      case 'body': return '';
      default: return 'MISSING-DROPDOWN-PARAM';
    };
  }
  static getHeaderTemplateLocation(itemType) {
    switch (itemType) {
      case 'Archetype Feat':
        return 'systems/bunkers-and-badasses/templates/general/dropdown/item-headers/archetype-feat-dropdown-header.html';
      case 'skill':
        return 'systems/bunkers-and-badasses/templates/general/dropdown/item-headers/class-skill-dropdown-header.html';
      case 'Action Skill':
        return 'systems/bunkers-and-badasses/templates/general/dropdown/item-headers/action-skill-dropdown-header.html';
      case 'base':
        return 'systems/bunkers-and-badasses/templates/general/dropdown/dropdown-header.html';
      default:
        return 'systems/bunkers-and-badasses/templates/general/dropdown/item-headers/default-dropdown-header.html';
    }
  }
  static getBodyTemplateLocation(itemType) {
    switch (itemType) { //grenade, shield, gun
      case 'gun':
        return 'systems/bunkers-and-badasses/templates/general/dropdown/gun-dropdown-details.html';
      case 'shield':
      case 'grenade':
        return 'systems/bunkers-and-badasses/templates/general/dropdown/mod-dropdown-details.html';
      default:
        return 'systems/bunkers-and-badasses/templates/general/dropdown/dropdown-details.html';
    }
  }

  static async toggleItemDetailsDropdown(event, dropdownData) {
    event.preventDefault();

    // Get the element to append to/remove from.
    const li = $(event.currentTarget);//.parents(`.${this.getComponentClass('group')}`);

    // Handle the hide/show portion.
    if (li.hasClass('expanded')) { // If expansion already shown - remove
      await this._removeDetailsDropdown(li);
    } else {
      await this._addDetailsDropdown(li, dropdownData);
    }
    li.toggleClass('expanded');
  }

  static async _removeDetailsDropdown(headerComponent) {
    const detailsDropdown = headerComponent.children(`.${this.getComponentClass('body')}`);
    detailsDropdown.slideUp(200, () => detailsDropdown.remove());
  }

  static async _addDetailsDropdown(headerComponenet, dropdownData) {
    const div = $(await this._dropdownDetailsHtmlTemplate(dropdownData));
    headerComponenet.append(div.hide());
    div.slideDown(200);
  }

  static async _dropdownDetailsHtmlTemplate(data) {
    if (!data) {
      return "no data found (probably because the developer messed something up).";
    }

    data.item = await Enricher.enrichItem(data.item);

    // Get the html template, create the data block, then put it together.
    const templateLocation = this.getBodyTemplateLocation(data.item.type);
    const dialogHtmlContent = await RenderTemplate(templateLocation, data);

    // Return the fully formed html.
    return dialogHtmlContent;
  }
}
  