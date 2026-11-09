import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import sharp from 'sharp';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, colorScheme: 'light' });
  await page.addInitScript(() => localStorage.setItem('tb_theme', 'light'));
  await page.goto(`${baseUrl}/ar/demo`, { waitUntil: 'networkidle' });
  const refuseCookies = page.getByRole('button', { name: 'رفض ملفات تعريف الارتباط للقياس' });
  if (await refuseCookies.count()) await refuseCookies.click();
  await page.getByRole('button', { name: 'إنشاء جلسة', exact: true }).click();
  const add = page.locator('[data-catalog]').getByRole('button', { name: 'إضافة', exact: true });
  for (let index = 0; index < 3; index += 1) await add.first().click();
  await page.getByRole('button', { name: 'إنشاء الجلسة', exact: true }).click();
  await page.getByRole('button', { name: 'إطلاق الجلسة' }).click({ timeout: 15000 });
  const stage = page.locator('[data-demo-challenge="copuzzle_live_v1"]');
  await stage.getByRole('button', { name: 'بدء التحدي' }).click();
  await stage.locator('button[disabled]').nth(7).waitFor({ timeout: 30000 });
  assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
  const capture = await stage.locator('xpath=../..').screenshot({ animations: 'disabled' });
  await sharp(capture).resize({ width: 1600 }).webp({ quality: 90 }).toFile('public/images/copuzzle-facilitator-live-ar.webp');
  console.log('CAPTURE_DEMO_HERO_AR_OK');
} finally {
  await browser.close();
}