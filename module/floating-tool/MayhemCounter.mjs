export default class MayhemCounter extends Application {
  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      id: "mayhem-counter",
      template: "systems/bunkers-and-badasses/templates/floating-tools/mayhem-counter.html",
      title: "Mayhem Counter",
    };
  }

  /**
   * Provide data to the HTML template for rendering
   * @type {Object}
   */
  getData() {
    return {
      ...super.getData(),
      mayhem: game.settings.get('bunkers-and-badasses', 'mayhem'),
      canEdit: game.user.isGM,// || game.settings.get('bunkers-and-badasses', 'playerCounterEdit');
    };
  }

  render(force = false, options = {}) {
    let userPosition = game.settings.get("bunkers-and-badasses", "counterToolPosition");
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
    game.settings.set("bunkers-and-badasses", "counterToolPosition", this.position)
  }

  activateListeners(html) {
    super.activateListeners(html);

    new Draggable(this, html, html.find(".drag-handle")[0], false);
    html.find('input').focusin(ev => { ev.target.select() });

    // Call setCounter when input is used
    this.input = html.find('input-controls').change(async ev => {
      const type = $(ev.currentTarget).attr('data-type');
      MayhemCounter.setCounter(ev.target.value, type);
    });

    // Call changeCounter when +/- is used
    html.find('.increase,.decrease').mousedown(async ev => {
      let input = $(ev.target.parentElement).find("input")
      const type = input.attr('data-type');
      const multiplier = $(ev.currentTarget).hasClass('increase') ? 1 : -1;
      $(ev.currentTarget).toggleClass("clicked");
      let newValue = await MayhemCounter.changeCounter(1 * multiplier, type);
      input[0].value = newValue
    });

    html.find('.increase,.decrease').mouseup(ev => {
      $(ev.currentTarget).removeClass("clicked");
    });
  }

  // ************************* STATIC FUNCTIONS ***************************

  /**
   * Set the counter of (type) to (value)
   * @param value Value to set counter to
   * @param type  Type of counter, "momentum" or "doom"
   */
  static async setCounter(value, type) {
    value = Math.round(value);

    if (!game.user.isGM) {
      game.socket.emit('system.bunkers-and-badasses', {
        type: 'setCounter',
        payload: {value, type},
      });
    } else {
      game.settings.set('bunkers-and-badasses', type, value);
    }

    return value;
  }

  /**
   * Change the counter of (type) by (value)
   * @param diff How much to change the counter
   * @param type  Type of counter, "momentum" or "doom"
   */
  static async changeCounter(diff, type) {
    let value = game.settings.get('bunkers-and-badasses', type);
    return await MayhemCounter.setCounter(value + diff, type)
  }


  static getValue(type) {
    return game.settings.get('bunkers-and-badasses', type);
  }

  get mayhem() {
    return MayhemCounter.getValue("mayhem")
  }
  
}

Hooks.on("renderSceneControls", (app, html, options) => {
  let button = $(`<li class='scene-controls' data-tooltip="${"Mayhem Counter"}"><i class="fa-solid fa-input-numeric"></i></li>`)
  
  button.on("click", () => {
    // Retain show/hide on refresh by storing in settings
    const position = game.settings.get("bunkers-and-badasses", "counterToolPosition");
    position.hide = game.counter.rendered;
    game.settings.set("bunkers-and-badasses", "counterToolPosition", position);
    
    game.counter.rendered ? game.counter.close() : game.counter.render(true);
  })

  html.find("ol.main-controls").append(button);
});