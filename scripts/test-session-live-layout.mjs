import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { createRealtimeFixture } from './helpers/realtime-ux-fixture.mjs';

const require = createRequire(import.meta.url);
const { buildPieces } = require('../../backend/src/challenges/engines/copuzzle_live_v1/server-runtime.js');
const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://127.0.0.1:3100';
const engineKey = 'copuzzle_live_v1';
const config = {
  grid: { rows: 4, cols: 4 },
  participants: { expected_count: 2 },
  timer: { enabled: true, duration_seconds: 1200 },
  chat: { enabled: true },
};
const state = {
  config,
  timer: { enabled: true, status: 'running', duration_seconds: 1200, remaining_seconds: 1130 },
  puzzle: { pieces: buildPieces(config) },
};
const cssSources = [
  ['../app/globals.css', null],
  ['../components/Challenges/ChallengeWrapper.module.css', 'ChallengeWrapper'],
  ['../components/Challenges/CopuzzleLive/Copuzzle.module.css', 'Copuzzle'],
].map(([file, module]) => ({ module, css: fs.readFileSync(new URL(file, import.meta.url), 'utf8') }));
const browser = await chromium.launch({
  headless: true,
  channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome',
});

try {
  for (const role of ['user', 'participant']) {
    for (const [locale, theme] of [['fr', 'light'], ['en', 'dark']]) {
      const fixture = await createRealtimeFixture(browser, { baseUrl, locale, theme, role, engineKey, state });
      try {
        const page = await fixture.context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        const route = role === 'user' ? 'session-live/42' : `challenges/${engineKey}?sessionId=42`;
        await page.goto(`${baseUrl}/${locale}/${route}`);
        await page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true }).click();
        const header = page.locator('section[class*="header"]').filter({ has: page.locator('[class*="topRow"]') });
        const arena = page.locator('[class*="boardPanel"]');
        await arena.waitFor();
        await header.waitFor();

        // Exercise the current styles even when the local server serves an older production build.
        const classNames = await page.locator('[class]').evaluateAll((nodes) => [...new Set(nodes.flatMap((node) => [...node.classList]))]);
        for (const { module, css } of cssSources) {
          let mappedSelectors = 0;
          const content = module
            ? css.replace(/:global\(([^)]+)\)/g, '$1').replace(/\.([a-zA-Z_][\w-]*)/g, (selector, name) => {
              const compiled = classNames.find((token) => token.startsWith(module) && (token.endsWith(`__${name}`) || token.includes(`_${name}__`)));
              if (compiled) mappedSelectors += 1;
              return compiled ? `.${compiled}` : selector;
            })
            : css.replace(/^@import.*$/gm, '');
          if (module) assert.ok(mappedSelectors > 0, `${module}: CSS module selectors must match the rendered interface`);
          await page.addStyleTag({ content });
        }

        // Larger CSS viewports reproduce the space available after browser zoom-out.
        for (const width of [1440, 2560, 720, 320]) {
          let previousHeaderHeight;
          for (const height of [900, 1800]) {
            await page.setViewportSize({ width, height });
            await page.evaluate(async () => {
              await document.fonts.ready;
              await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            });
            const label = `${role}, ${locale}, ${theme}, ${width}x${height}`;
            const headerBox = await header.boundingBox();
            const arenaBox = await arena.boundingBox();
            const gameBox = await page.locator('[class*="copuzzleContainer"]').boundingBox();
            assert.ok(headerBox.height < (width <= 420 ? 260 : 180), `${label}: stretched session header (${headerBox.height}px)`);
            if (previousHeaderHeight !== undefined) {
              assert.ok(Math.abs(headerBox.height - previousHeaderHeight) <= 1, `${label}: viewport height must not stretch the header`);
            }
            previousHeaderHeight = headerBox.height;
            assert.ok(arenaBox.y >= headerBox.y + headerBox.height, `${label}: header overlaps the game`);
            assert.ok(gameBox.y - headerBox.y - headerBox.height < 80, `${label}: excessive space before the game`);
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label}: horizontal page overflow`);
            if (width > 1360) {
              const container = role === 'user'
                ? page.locator('.session-live-shell')
                : page.locator('[class*="challengeContainer"]');
              const box = await container.boundingBox();
              assert.ok(box.width <= 1360, `${label}: session width must be capped (${box.width}px)`);
              assert.ok(Math.abs(box.x - (width - box.width) / 2) <= 1, `${label}: session must be centered`);
            }
            if (width <= 720) {
              const sideBox = await page.locator('[class*="sidePanel"]').boundingBox();
              assert.ok(sideBox.y >= arenaBox.y + arenaBox.height - 1, `${label}: sidebar must stack below the board`);
            }
          }
        }
        assert.deepEqual(errors, [], `${role}, ${locale}: browser errors`);
        process.stdout.write(`PASS: session layout, ${role}, ${locale}, ${theme}, mobile/desktop/zoom-out viewports\n`);
      } finally {
        await fixture.close();
      }
    }
  }
} finally {
  await browser.close();
}
