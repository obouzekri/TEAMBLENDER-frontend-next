import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from 'next/constants.js';
import nextConfig from '../next.config.mjs';

const projectRoot = new URL('../', import.meta.url);
const fixture = await mkdtemp(path.join(tmpdir(), 'teamblender-build-'));

try {
  for (const name of ['tsconfig.json', 'tsconfig.build.json']) {
    await copyFile(new URL(name, projectRoot), path.join(fixture, name));
  }
  await mkdir(path.join(fixture, '.next', 'dev', 'types'), { recursive: true });
  await mkdir(path.join(fixture, '.next', 'types'), { recursive: true });
  await mkdir(path.join(fixture, 'scripts'));
  await writeFile(path.join(fixture, '.next', 'dev', 'types', 'routes.d.ts'), 'invalid dev types !!!');
  await writeFile(path.join(fixture, '.next', 'types', 'routes.d.ts'), 'export {};');
  await writeFile(path.join(fixture, 'page.ts'), 'export const page = true;');
  await writeFile(path.join(fixture, 'tsconfig.tsbuildinfo'), 'stale cache');
  await writeFile(path.join(fixture, 'tsconfig.build.tsbuildinfo'), 'stale cache');

  const parseConfig = (name) => {
    const file = path.join(fixture, name);
    const config = ts.readConfigFile(file, ts.sys.readFile);
    assert.equal(config.error, undefined);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, fixture);
    assert.deepEqual(parsed.errors, []);
    return parsed;
  };
  const dev = parseConfig('tsconfig.json');
  const build = parseConfig('tsconfig.build.json');
  const devTypes = path.join(fixture, '.next', 'dev', 'types', 'routes.d.ts').replaceAll('\\', '/');
  assert.ok(dev.fileNames.includes(devTypes));
  assert.ok(!build.fileNames.includes(devTypes));
  assert.ok(build.fileNames.some((name) => name.endsWith('/.next/types/routes.d.ts')));
  assert.ok(build.fileNames.some((name) => name.endsWith('/page.ts')));
  assert.equal(build.options.noEmit, true);
  assert.equal(build.options.strict, dev.options.strict);
  assert.equal(nextConfig(PHASE_PRODUCTION_BUILD).typescript.tsconfigPath, 'tsconfig.build.json');
  assert.equal(nextConfig(PHASE_DEVELOPMENT_SERVER).typescript.tsconfigPath, 'tsconfig.json');
  assert.notEqual(nextConfig(PHASE_PRODUCTION_BUILD).typescript.ignoreBuildErrors, true);

  await copyFile(new URL('scripts/clean-build.mjs', projectRoot), path.join(fixture, 'scripts', 'clean-build.mjs'));
  for (let pass = 0; pass < 2; pass += 1) {
    const result = spawnSync(process.execPath, [path.join(fixture, 'scripts', 'clean-build.mjs')], {
      cwd: fileURLToPath(projectRoot),
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    for (const name of ['.next', 'tsconfig.tsbuildinfo', 'tsconfig.build.tsbuildinfo']) {
      await assert.rejects(readFile(path.join(fixture, name)), { code: 'ENOENT' });
    }
    assert.equal(await readFile(path.join(fixture, 'page.ts'), 'utf8'), 'export const page = true;');
  }
  console.log('TEST_BUILD_CONFIG_OK');
} finally {
  await rm(fixture, { recursive: true, force: true });
}
