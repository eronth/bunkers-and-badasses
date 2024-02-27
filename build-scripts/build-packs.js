import { promises as fs } from 'fs';
import { compilePack } from '@foundryvtt/foundryvtt-cli'

// Read JSON files from a directory
const MODULE_ID = process.cwd();
const yaml = false;

const sourcePath = 'src/packs';
const targetPath = 'packs';
let packsLocation = ''


packsLocation = 'Corraza';
const gearPacks = await fs.readdir(`./${sourcePath}/${packsLocation}`);
for (const pack of gearPacks) {
  if (pack === '.gitattributes') continue;
  console.log('Packing ' + pack);
  await compilePack(
    `${MODULE_ID}/${sourcePath}/${packsLocation}/${pack}`,
    `${MODULE_ID}/${targetPath}/${packsLocation}/${pack}`,
    { yaml }
  );
}


packsLocation = 'Corraza/weapons';
const weaponPacks = await fs.readdir(`./${sourcePath}/${packsLocation}`);
for (const pack of weaponPacks) {
  if (pack === '.gitattributes') continue;
  console.log('Packing ' + pack);
  await compilePack(
    `${MODULE_ID}/${sourcePath}/${packsLocation}/${pack}`,
    `${MODULE_ID}/${targetPath}/${packsLocation}/${pack}`,
    { yaml }
  );
}