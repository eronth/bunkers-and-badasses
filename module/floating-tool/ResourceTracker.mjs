export default class ResourceTracker extends Application {
  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      id: "resource-tracker",
      template: "systems/bunkers-and-badasses/templates/floating-tools/resource-tracker.html",
      title: "Resource Tracker",
    };
  }

  static smallSizeCutoff = 2;
  static smallSizeTextHeightOffset = 6;
  static defaultHeight = 133;
  static defaultWidth = 227;

  /**
   * Provide data to the HTML template for rendering
   * @type {Object}
   */
  getData() {
    const isGM = game.user.isGM;
    const trackers = game.settings.get('bunkers-and-badasses', 'trackedResources');
    for (let i = 0; i < trackers.length; i++) {
      trackers[i].canSee = trackers[i].playersCanSee || isGM;
      trackers[i].canEdit = trackers[i].playersCanEdit || isGM;
    }
    return {
      ...super.getData(),
      isGM: isGM,
      smallerBox: trackers.length <= ResourceTracker.smallSizeCutoff,
      trackedResources: trackers,
    };
  }

  render(force = false, options = {}) {
    let userPosition = game.settings.get("bunkers-and-badasses", "resourceTrackerToolPosition");
    if (userPosition.hide) { return; }
    
    options.top = userPosition.top || window.innerHeight - 200;
    options.left = userPosition.left || 250;
    //options.width = null;
    //game.tracker.position.width = null;
    //this.position.width = null;
    
    super.render(force, options);
  }

  async _render(...args) {
    await super._render(...args)
    delete ui.windows[this.appId]
  }

  setPosition(...args) {
    super.setPosition(...args);
    game.settings.set("bunkers-and-badasses", "resourceTrackerToolPosition", game.tracker.position)
  }

  activateListeners(html) {
    super.activateListeners(html);

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
      input[0].value = newValue;
    });

    html.find('.increase,.decrease').mouseup(ev => {
      $(ev.currentTarget).removeClass("clicked");
    });

    html.find('.add-resource-tracker').click(async ev => {
      const popup = new Dialog({
        title: "Add Resource Tracker",
        content: `<div class="floating-tool-prompt"><p>Enter the name of the new tracker:</p><input type="text" id="newTrackerName" />
          <p>Initial value:</p><input type="Number" id="newTrackerValue" value=0 /></div>`,
        buttons: {
          cancel: { label: "Cancel" },
          ok: {
            icon: '<i class="fas fa-plus"></i>',
            label: "Add",
            callback: async () => {
              const newTrackerName = document.getElementById("newTrackerName").value;
              const newTrackerValue = Number(document.getElementById("newTrackerValue").value ?? 0);
              if (newTrackerName) {
                await ResourceTracker.addTrackedResource({name: newTrackerName, value: newTrackerValue});
              }
            },
          },
        },
      });
      popup.render(true);
    });

    html.find('.remove-resource-tracker').click(async ev => {
      const trackerIndex = $(ev.currentTarget).parents('.tracker').attr('data-key');
      const trackers = ResourceTracker.getValue("trackedResources");
      const popup = new Dialog({
        title: "Remove Resource Tracker",
        content: `Remove the tracker for "${trackers[trackerIndex].name}"?`,
        buttons: {
          cancel: { label: "Cancel" },
          ok: {
            icon: '<i class="fas fa-trash"></i>',
            label: "Remove",
            callback: async () => {
              if (trackerIndex) {
                await ResourceTracker.removeTrackedResource(trackerIndex);
              }
            },
          },
        },
      });
      popup.render(true);
    });

    html.find('.toggle-visibility').click(async ev => {
      const trackerIndex = $(ev.currentTarget).parents('.tracker').attr('data-key');
      await ResourceTracker.toggleTrackerVisibility(trackerIndex);
    });

    html.find('.toggle-editability').click(async ev => {
      const trackerIndex = $(ev.currentTarget).parents('.tracker').attr('data-key');
      await ResourceTracker.toggleTrackerEditability(trackerIndex);
    });

    html.find('.input-controls input').change(async ev => {
      const trackerIndex = $(ev.currentTarget).parents('.tracker').attr('data-key');
      const newValue = Number(ev.target.value);
      await ResourceTracker.modifyTrackerValue(trackerIndex, newValue);
    });

  }

  close() {
    const position = {
      ...game.settings.get("bunkers-and-badasses", "resourceTrackerToolPosition"),
      hide: true,
    };
    game.settings.set("bunkers-and-badasses", "resourceTrackerToolPosition", position);
    super.close();
  }

  // ************************* GET SET ***************************
  static getValue(type) {
    return game.settings.get('bunkers-and-badasses', type);
  }

  get trackedResources() {
    return ResourceTracker.getValue("trackedResources");
  }

  static async getTrackedResources() {
    return game.settings.get('bunkers-and-badasses', 'trackedResources');
  }

  static async setTrackedResources(resourceTrackers, options) {
    if (!game.user.isGM) {
      game.socket.emit('system.bunkers-and-badasses', {
        type: 'setTrackedResources',
        payload: resourceTrackers,
      });
    } else {
      await game.settings.set('bunkers-and-badasses', 'trackedResources', resourceTrackers);
      await ResourceTracker.updateRender(options);
    }

    return resourceTrackers;
  }
  
  // ************************* STATIC FUNCTIONS ***************************

  // + Add
  static async addTrackedResource(options) {
    let trackedResources = await ResourceTracker.getTrackedResources();
    trackedResources.push({
      name: options?.name ?? 'Resource',
      value: options?.value ?? 0,
      playersCanSee: options?.playersCanSee ?? false,
      playersCanEdit: options?.playersCanEdit ?? false,
    });
    await ResourceTracker.setTrackedResources(trackedResources, { diff: 1 });
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
    // TODO - Implement
  }

  // CanSee
  static async toggleTrackerVisibility(id) {
    let trackedResources = await ResourceTracker.getTrackedResources();
    trackedResources[id].playersCanSee = !trackedResources[id].playersCanSee;
    await ResourceTracker.setTrackedResources(trackedResources);
  }

  // CanEdit
  static async toggleTrackerEditability(id) {
    let trackedResources = await ResourceTracker.getTrackedResources();
    trackedResources[id].playersCanEdit = !trackedResources[id].playersCanEdit;
    await ResourceTracker.setTrackedResources(trackedResources);
  }

  // Trash
  static async removeTrackedResource(id) {
    let trackedResources = await ResourceTracker.getTrackedResources();
    //delete trackedResources[id];
    trackedResources.splice(id, 1);
    await ResourceTracker.setTrackedResources(trackedResources, { diff: -1 });
  }

  // Re-render (useful for changes).
  static async updateRender(options) {
    if (game.tracker.rendered) {
      const resources = await ResourceTracker.getTrackedResources();
      const newSize = resources.length;
      const oldSize = newSize - options.diff;
      
      const newPosition = game.tracker.position;
      
      if (options && options.diff) {
        if (newSize != 0) {
          // If we are adding the first tracker, set the width to a default.
          newPosition.width = (newSize > 0 && oldSize == 0)
            ? ResourceTracker.defaultWidth
            : (newSize * game.tracker.position.width) / oldSize;
        }
      }

      // If we are adding the first tracker, set the height to a default.
      if (newSize > 0 && oldSize == 0) {
        newPosition.height = ResourceTracker.defaultHeight;
      } 
      // If we cross the height threshold, adjust the height of the tracker.
      else if (oldSize <= ResourceTracker.smallSizeCutoff && newSize > ResourceTracker.smallSizeCutoff) {
        newPosition.height = newPosition.height + ResourceTracker.smallSizeTextHeightOffset;
      } else if (oldSize > ResourceTracker.smallSizeCutoff && newSize <= ResourceTracker.smallSizeCutoff) {
        newPosition.height = newPosition.height - ResourceTracker.smallSizeTextHeightOffset;
      }

      await game.tracker.render();
      game.tracker.setPosition(newPosition);
    }
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