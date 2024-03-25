import { extractPack } from "@foundryvtt/foundryvtt-cli";
import { promises as fs } from "fs";
import path from "path";

const MODULE_ID = process.cwd();
const yaml = false;

const jsonPath = 'src/packs';
const dataPath = 'packs';
let packsLocation = ''

packsLocation = 'Corraza';
const gearPacks = await fs.readdir(`./${dataPath}/${packsLocation}`);
for (const pack of gearPacks) {
  if (pack === ".gitattributes") continue;
  console.log("Unpacking " + pack);
  const directory = `./${jsonPath}/${packsLocation}/${pack}`;
  try {
    for (const file of await fs.readdir(directory)) {
      await fs.unlink(path.join(directory, file));
    }
  } catch (error) {
    if (error.code === "ENOENT") console.log("No files inside of " + pack);
    else console.log(error);
  }
  await extractPack(
    `${MODULE_ID}/${dataPath}/${packsLocation}/${pack}`,
    `${MODULE_ID}/${jsonPath}/${packsLocation}/${pack}`,
    {
      yaml,
      transformName,
    }
  );
}


packsLocation = 'Corraza/weapons';
const weaponPacks = await fs.readdir(`./${dataPath}/${packsLocation}`);
for (const pack of weaponPacks) {
  if (pack === ".gitattributes") continue;
  console.log("Unpacking " + pack);
  const directory = `./${jsonPath}/${packsLocation}/${pack}`;
  try {
    for (const file of await fs.readdir(directory)) {
      await fs.unlink(path.join(directory, file));
    }
  } catch (error) {
    if (error.code === "ENOENT") console.log("No files inside of " + pack);
    else console.log(error);
  }
  await extractPack(
    `${MODULE_ID}/${dataPath}/${packsLocation}/${pack}`,
    `${MODULE_ID}/${jsonPath}/${packsLocation}/${pack}`,
    {
      yaml,
      transformName,
    }
  );
}

/**
 * Prefaces the document with its type
 * @param {object} doc - The document data
 */
function transformName(doc) {
  const safeFileName = doc.name.replace(/[^a-zA-Z0-9А-я]/g, "_");
  const type = doc._key.split("!")[1];
  const prefix = ["actors", "items"].includes(type) ? doc.type : type;

  return `${doc.name ? `${prefix}_${safeFileName}_${doc._id}` : doc._id}.${
    yaml ? "yml" : "json"
  }`;
}