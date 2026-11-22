import { cpSync, mkdirSync } from 'node:fs';

const output = new URL('../dist-edge/', import.meta.url);
mkdirSync(output, { recursive: true });
for (const folder of ['assets', 'admin']) {
  cpSync(new URL('../' + folder + '/', import.meta.url), new URL(folder + '/', output), { recursive: true });
}
