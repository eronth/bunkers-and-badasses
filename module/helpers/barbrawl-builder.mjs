export class BarbrawlBuilder {
  static _buildBarbrawlBars(flags) {
    const barDefaults = {
      'position': 'top-outer',
      'otherVisibility': CONST.TOKEN_DISPLAY_MODES.HOVER,
      'ownerVisibility': CONST.TOKEN_DISPLAY_MODES.ALWAYS
    };

    let order = 0;
    const tokenBars = { };    
    this.determineBarBrawlBar(tokenBars, "Bone", order++,
      { max: '#bbbbbb', min: '#333333'}, barDefaults, flags);
    this.determineBarBrawlBar(tokenBars, "Flesh", order++,
      { max: '#d23232', min: '#a20b0b'}, barDefaults, flags);
    this.determineBarBrawlBar(tokenBars, "Armor", order++,
      { max: '#ffdd00', min: '#e1cc47'}, barDefaults, flags);
    this.determineBarBrawlBar(tokenBars, "Shield", order++,
      { max: '#24e7eb', min: '#79d1d2'}, barDefaults, flags);
    this.determineBarBrawlBar(tokenBars, "Eridian", order++,
      { max: '#ff00ff', min: '#bb00bb'}, barDefaults, flags);

    return tokenBars;
  }

  static determineBarBrawlBar(tokenBars, healthType, order, colors, config, flags) {
    if (flags.useAllHealth || flags[`use${healthType}`]) {
      const barId = `bar${healthType}`;
      tokenBars[barId] = {
        'id': barId,
        'order': order,
        'maxcolor': colors.max,
        'mincolor': colors.min,
        'attribute': `attributes.hps.${healthType.toLowerCase()}`,
        ...config
      };
    }
  }
      

}