export class Dropdown {
  static async dropdownDetailsHtmlTemplate(data) {
    if (!data) {
      return "no data found (probably because the developer messed something up).";
    }

    // Get the html template, create the data block, then put it together.
    const templateLocation = 'systems/bunkers-and-badasses/templates/general/dropdown/dropdown-details.html';
    const enrichedData = {
      ...data,
      type: data.type,
      description: await TextEditor.enrichHTML(data.description, {async: true})
    };
    const dialogHtmlContent = await renderTemplate(templateLocation, { data: enrichedData});

    // Return the fully formed html.
    return dialogHtmlContent;
  }
}
  