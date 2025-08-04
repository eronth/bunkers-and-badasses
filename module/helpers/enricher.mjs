import { TextEditor } from "../helpers/foundryAccessHelper.mjs";

export class Enricher {
    static async enrichItem(item) {
        const enrichOptions = { secrets: this.actor?.isGM };

        item.system.enriched = {
            prefix: {
                effects: await TextEditor.enrichHTML(item.system.prefix?.effects, enrichOptions),
            },
            guildBonus: await TextEditor.enrichHTML(item.system.guildBonus, enrichOptions),
            effect: await TextEditor.enrichHTML(item.system.effect, enrichOptions),
            classEffect: await TextEditor.enrichHTML(item.system.classEffect, enrichOptions),
            description: await TextEditor.enrichHTML(item.system.description, enrichOptions),
            notes: await TextEditor.enrichHTML(item.system.notes, enrichOptions),
            redTextEffect: await TextEditor.enrichHTML(item.system.redTextEffect, enrichOptions),
            redTextEffectBM: await TextEditor.enrichHTML(item.system.redTextEffectBM, enrichOptions),
        };

        return item;
    }
} 