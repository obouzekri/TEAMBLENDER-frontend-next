import { rm } from 'node:fs/promises';

const projectRoot = new URL('../', import.meta.url);

for (const name of ['.next', 'tsconfig.tsbuildinfo', 'tsconfig.build.tsbuildinfo']) {
  await rm(new URL(name, projectRoot), { recursive: true, force: true });
}

console.log('Next.js output and TypeScript build caches removed.');
