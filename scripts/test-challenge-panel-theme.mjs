import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { readGlobalCss } from './helpers/global-css.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const globalCss = readGlobalCss();
const modules = [
  ['MissionCritique', 'MissionCritique', 'container', ['card taskCard', 'card timelineCard']],
  ['PhraseCoop', 'PhraseCoop', 'phraseContainer', ['boardPanel', 'sideCard']],
  ['CopuzzleLive', 'Copuzzle', 'copuzzleContainer', ['boardPanel', 'sideCard']],
  ['CrosswordLive', 'CrosswordChallenge', 'root', ['card', 'card boardPanel']],
  ['PixelArchitect', 'PixelArchitect', 'container', ['panel']],
  ['LabDInnovation', 'LabDInnovation', 'shell', ['card']],
  ['LabyrintheLive', 'Labyrinthe', 'labyrinthContainer', ['panel']],
  ['VraiOuMensonge', 'VraiOuMensonge', 'shell', ['card']],
  ['TheQuiz', 'TheQuiz', 'pageShell', ['screenCard', 'questionPromptPanel', 'rankingCardWrap']],
  ['EscapeRoom', 'EscapeRoom', 'escapeRoomContainer', ['card', 'card mainCard']],
];

function moduleCss(source, prefix = '') {
  const globals = [];
  const protectedCss = source.replace(/:global\(([^)]+)\)/g, (_, selector) => {
    globals.push(selector);
    return `GLOBAL_SELECTOR_${globals.length - 1}`;
  });
  return protectedCss
    .replace(/\.([a-zA-Z_][\w-]*)/g, (_, name) => `.${prefix}${name}`)
    .replace(/GLOBAL_SELECTOR_(\d+)/g, (_, index) => globals[Number(index)]);
}

const sharedCss = ['ChallengeTimerCard', 'ChallengeChatCard', 'ChallengeRulesPanel']
  .map((name) => moduleCss(read('components', 'Challenges', `${name}.module.css`), 'shared_'))
  .join('\n');
const expected = 'linear-gradient(165deg, rgba(16, 33, 49, 0.9), rgba(10, 24, 36, 0.9))';
const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });
try {
  const page = await browser.newPage();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [folder, name, container, panels] of modules) {
      await page.emulateMedia({ colorScheme: 'light' });
      await page.setContent(`<html data-theme="light"><body><main class="${container}">
        ${panels.map((classes) => `<section data-panel class="${classes}">Panel</section>`).join('')}
        <section data-panel class="shared_timerCard">
          <div class="shared_timerRing shared_timerRingSafe"><span class="shared_timerTime">09:50</span></div>
        </section>
        <section data-panel class="shared_timerCard shared_timerCardStarted">Running</section>
        <section data-panel class="shared_chatCard">Chat</section>
        <section data-panel class="shared_rulesCard">Rules</section>
      </main></body></html>`);
      await page.addStyleTag({ content: `${globalCss}\n${sharedCss}\n${moduleCss(read('components', 'Challenges', folder, `${name}.module.css`))}` });
      const backgrounds = () => page.locator('[data-panel]').evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).background));
      const lightBackgrounds = await backgrounds();
      for (const theme of ['dark', 'system']) {
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.evaluate((value) => {
          if (value === 'system') document.documentElement.removeAttribute('data-theme');
          else document.documentElement.dataset.theme = value;
        }, theme);
        const images = await page.locator('[data-panel]').evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).backgroundImage));
        for (const image of images) assert.equal(image, expected, `${name}, ${width}px, ${theme}: panel background`);
        const center = await page.locator('.shared_timerRing').evaluate((node) => getComputedStyle(node, '::after').backgroundImage);
        assert.equal(center, expected, `${name}: timer center background`);
        const safeColor = await page.locator('.shared_timerRing').evaluate((node) => getComputedStyle(node).color);
        assert.equal(safeColor, 'rgb(16, 185, 129)', `${name}: safe timer tone`);
        await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
        assert.deepEqual(await backgrounds(), lightBackgrounds, `${name}: explicit light theme must stay unchanged on a dark system`);
      }
      console.log(`PASS: ${name}, ${width}px, explicit/system dark and light`);
    }
  }
} finally {
  await browser.close();
}
