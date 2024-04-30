export default class ResourceTracker extends Application {
  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      id: "resource-tracker",
      template: "systems/bunkers-and-badasses/templates/floating-tools/resource-tracker.html",
      title: "Resource Tracker",
    };
  }

  /**
   * Provide data to the HTML template for rendering
   * @type {Object}
   */
  getData() {
    const sneep = game.settings.get('bunkers-and-badasses', 'trackedResources');
    return {
      ...super.getData(),
      canEdit: game.user.isGM,
      trackedResources: game.settings.get('bunkers-and-badasses', 'trackedResources'),
    };
  }

  render(force = false, options = {}) {
    let userPosition = game.settings.get("bunkers-and-badasses", "resourceTrackerToolPosition");
    if (userPosition.hide) { return; }
    
    options.top = userPosition.top || window.innerHeight - 200;
    options.left = userPosition.left || 250;
    
    super.render(force, options);
  }

  async _render(...args) {
    await super._render(...args)
    delete ui.windows[this.appId]
  }

  setPosition(...args) {
    super.setPosition(...args);
    game.settings.set("bunkers-and-badasses", "resourceTrackerToolPosition", this.position)
  }

  activateListeners(html) {
    super.activateListeners(html);

    new Draggable(this, html, html.find(".drag-handle")[0], false);
    html.find('input').focusin(ev => { ev.target.select() });

    // Call setTracker when input is used
    this.input = html.find('input-controls').change(async ev => {
      const type = $(ev.currentTarget).attr('data-type');
      ResourceTracker.setTracker(ev.target.value, type);
    });

    // Call modifyTrackerValue when +/- is used
    html.find('.increase,.decrease').mousedown(async ev => {
      const input = $(ev.target.parentElement).find("input")
      const trackerIndex = $(ev.currentTarget).parents('.tracker').attr('data-key');
      const multiplier = $(ev.currentTarget).hasClass('increase') ? 1 : -1;
      $(ev.currentTarget).toggleClass("clicked");
      const newValue = await ResourceTracker.modifyTrackerValue(trackerIndex, 1 * multiplier);
      input[0].value = newValue
    
    });

    html.find('.increase,.decrease').mouseup(ev => {
      $(ev.currentTarget).removeClass("clicked");
    });

    html.find('.add-resource-tracker').click(async ev => {
      const popup = new Dialog({
        title: "Add Resource Tracker",
        content: `<p>Enter the name of the new tracker:</p><input type="text" id="newTrackerName" />
          <p>Initial value:</p><input type="Number" id="newTrackerValue" value=0 />`,
        buttons: {
          ok: {
            label: "Add",
            callback: async () => {
              const newTrackerName = document.getElementById("newTrackerName").value;
              const newTrackerValue = Number(document.getElementById("newTrackerValue").value ?? 0);
              if (newTrackerName) {
                await ResourceTracker.addTrackedResource({name: newTrackerName, value: newTrackerValue});
              }
            },
          },
          cancel: { label: "Cancel" },
        },
      });
      popup.render(true);
    });

    html.find('.remove-resource-tracker').click(async ev => {
      const trackerIndex = $(ev.currentTarget).parents('.tracker').attr('data-key');
      const popup = new Dialog({
        title: "Remove Resource Tracker",
        content: ``,
        buttons: {
          ok: {
            icon: '<i class="fas fa-trash"></i>',
            label: "Remove",
            callback: async () => {
              if (trackerIndex) {
                await ResourceTracker.removeTrackedResource(trackerIndex);
                this.render(true);
              }
            },
          },
          cancel: { label: "Cancel" },
        },
      });
      popup.render(true);
    });
  }

  // ************************* GET SET ***************************
  static getValue(type) {
    return game.settings.get('bunkers-and-badasses', type);
  }

  get trackedResources() {
    return ResourceTracker.getValue("trackedResources");
  }
  
  // ************************* STATIC FUNCTIONS ***************************

  // + Add
  static async addTrackedResource(options) {
    let trackedResources = await ResourceTracker.getTrackedResources();
    trackedResources.push({
      name: options?.name ?? 'Resource',
      value: options?.value ?? 0,
      playersCanSee: options?.playersCanSee ?? false,
      palyersCanEdit: options?.playersCanEdit ?? false,
    });
    await ResourceTracker.setTrackedResources(trackedResources);
    await ResourceTracker.updateRender();
  }

  // +/-
  static async modifyTrackerValue(id, diff) {
    const trackedResources = await ResourceTracker.getTrackedResources();
    trackedResources[id].value += diff;
    await ResourceTracker.setTrackedResources(trackedResources);
    return trackedResources[id].value;
  }

  // Edit (name, value, others?)
  static async updateTrackerData() {

  }

  // CanSee
  static async updateTrackerVisibility(id, visibility) {
    let trackedResources = await ResourceTracker.getTrackedResources();
    trackedResources[id].playersCanSee = visibility;
    await ResourceTracker.setTrackedResources(trackedResources);
  }

  // CanEdit
  static async updateTrackerEditability() {

  }

  // Trash
  static async removeTrackedResource(id) {
    let trackedResources = await ResourceTracker.getTrackedResources();
    //delete trackedResources[id];
    trackedResources.splice(id, 1);
    await ResourceTracker.setTrackedResources(trackedResources);
  }

  
  static async updateRender() {
    if (game.tracker.rendered) {
      game.tracker.render(true);
    }
  }


  static async getTrackedResources() {
    return game.settings.get('bunkers-and-badasses', 'trackedResources');
  }

  static async setTrackedResources(resourceTrackers) {
    if (!game.user.isGM) {
      game.socket.emit('system.bunkers-and-badasses', {
        type: 'setTrackedResources',
        payload: resourceTrackers,
      });
    } else {
      await game.settings.set('bunkers-and-badasses', 'trackedResources', resourceTrackers);
    }

    return resourceTrackers;
  }

  

  

}

Hooks.on("renderSceneControls", async (app, html, options) => {
  let button = $(`<li class='scene-controls' data-tooltip="${"Resource Tracker"}"><i class="fa-solid fa-input-numeric"></i></li>`)
  
  button.on("click", () => {
    // Retain show/hide on refresh by storing in settings
    const position = game.settings.get("bunkers-and-badasses", "resourceTrackerToolPosition");
    position.hide = game.tracker.rendered;
    game.settings.set("bunkers-and-badasses", "resourceTrackerToolPosition", position);
    
    game.tracker.rendered ? game.tracker.close() : game.tracker.render(true);
  });

  html.find("ol.main-controls").append(button);

  // Render the tracker if it was open on refresh
  if (!game.settings.get("bunkers-and-badasses", "resourceTrackerToolPosition").hide) {
    game.tracker.render(true);
  };
});