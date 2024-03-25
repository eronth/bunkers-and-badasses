import { DefaultData } from "./defaultData.mjs";

export class BarbrawlBuilder {
  
  static buildResourceBars(options) {
    const { resourceFlags } = options;

    const bars = DefaultData.barBrawlResourceBars(resourceFlags);
    return bars;
  }
  
}