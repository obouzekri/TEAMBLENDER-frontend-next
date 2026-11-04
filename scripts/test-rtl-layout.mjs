import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

// Mise en page de droite à gauche, séparée de la traduction : par défaut, pages anglaises forcées
// en dir="rtl" (fausse locale RTL). RTL_TEST_LOCALE=ar pour tester les vraies pages arabes.
// RTL_SCREENSHOTS=<dossier> enregistre une capture par page et par largeur.
const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://127.0.0.1:3100';
const locale = process.env.RTL_TEST_LOCALE || 'en';
const screenshotDir = process.env.RTL_SCREENSHOTS || '';
const pages = ['/', '/pricing', '/contact', '/demo', '/team-building', '/login', '/signup', '/forgot-password', '/participant'];
const viewports = [{ width: 1280, height: 900 }, { width: 390, height: 844 }];

const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });
const failures = [];
if (screenshotDir) fs.mkdirSync(screenshotDir, { recursive: true });

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, locale: locale === 'ar' ? 'ar' : 'en-US' });
    const page = await context.newPage();
    for (const route of pages) {
      const url = `${baseUrl}/${locale}${route === '/' ? '' : route}`;
      await page.goto(url, { waitUntil: 'networkidle' });
      // Fausse locale : forcer dir="rtl" sans changer le texte.
      if (locale !== 'ar') await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
      await page.waitForTimeout(400);
      const report = await page.evaluate(() => {
        const root = document.documentElement;
        const width = window.innerWidth;
        // Éléments visibles qui dépassent de l'écran (cause de défilement horizontal en RTL).
        const overflowing = [...document.querySelectorAll('body *')]
          .filter((node) => {
            const style = getComputedStyle(node);
            if (style.position === 'fixed' && style.visibility === 'hidden') return false;
            const box = node.getBoundingClientRect();
            return box.width > 0 && box.height > 0 && (box.left < -2 || box.right > width + 2)
              && !node.closest('[aria-hidden="true"], .sr-only, .skip-to-content, [data-board-direction]');
          })
          .filter((node, _, all) => !all.some((other) => other !== node && other.contains(node)))
          .slice(0, 5)
          .map((node) => `${node.tagName.toLowerCase()}.${String(node.className || '').split(' ').filter(Boolean).slice(0, 2).join('.')}`);
        return { dir: root.getAttribute('dir'), scrollWidth: root.scrollWidth, width, overflowing };
      });
      const label = `${route} @${viewport.width}px`;
      if (report.dir !== 'rtl') failures.push(`${label}: dir=${report.dir}`);
      if (report.scrollWidth > report.width + 1) {
        failures.push(`${label}: horizontal scroll (${report.scrollWidth}px > ${report.width}px) ${report.overflowing.join(', ')}`);
      }
      if (screenshotDir) {
        const name = `${locale}${route.replace(/\//g, '_') || '_home'}-${viewport.width}.png`;
        await page.screenshot({ path: path.join(screenshotDir, name), fullPage: true });
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

assert.deepEqual(failures, [], `RTL layout issues:\n${failures.join('\n')}`);
console.log('TEST_RTL_LAYOUT_OK');
