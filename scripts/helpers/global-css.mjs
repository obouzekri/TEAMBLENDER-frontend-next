import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'app');

// globals.css only lists ordered @import slices: inline the local ones and drop Tailwind's import.
export function readGlobalCss() {
  const index = fs.readFileSync(path.join(appDir, 'globals.css'), 'utf8');
  return index.replace(/^@import\s+["']([^"']+)["'];?\s*$/gm, (_, target) => (
    target.startsWith('./') ? fs.readFileSync(path.join(appDir, target), 'utf8') : ''
  ));
}
