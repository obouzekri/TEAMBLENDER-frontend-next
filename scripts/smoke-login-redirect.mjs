import { chromium } from 'playwright';

const FRONTEND_URL = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const MANAGER_EMAIL = process.env.SMOKE_MANAGER_EMAIL || 'admin@admin.com';
const MANAGER_PASSWORD = process.env.SMOKE_MANAGER_PASSWORD || process.env.CATALOG_ADMIN_PASSWORD || 'Admin1234!';
const BROWSER_CHANNEL = process.env.SMOKE_BROWSER_CHANNEL || 'chrome';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function setReactInputValue(locator, value) {
  await locator.evaluate((node, nextValue) => {
    const element = node;
    const prototype = Object.getPrototypeOf(element);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    if (descriptor && typeof descriptor.set === 'function') {
      descriptor.set.call(element, nextValue);
    } else {
      element.value = nextValue;
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function run() {
  let browser = null;

  try {
    browser = await chromium.launch({ headless: true, channel: BROWSER_CHANNEL });
  } catch (error) {
    throw new Error(`Unable to launch browser channel "${BROWSER_CHANNEL}". ${error.message}`);
  }

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'domcontentloaded' });

    const emailInput = page.getByLabel('Email');
    const passwordInput = page.locator('input#login-password');
    const submitButton = page.locator('form.auth-form button:has-text("Se connecter")');

    await emailInput.waitFor({ timeout: 15000 });
    await passwordInput.waitFor({ timeout: 15000 });

    await emailInput.click();
    await page.keyboard.type(MANAGER_EMAIL, { delay: 20 });
    await passwordInput.click();
    await page.keyboard.type(MANAGER_PASSWORD, { delay: 20 });

    const emailValue = await emailInput.inputValue();
    const passwordValue = await passwordInput.inputValue();
    assert(emailValue.trim().length > 0, 'Email input is empty before submit');
    assert(passwordValue.trim().length > 0, 'Password input is empty before submit');

    const redirected = page.waitForURL(/\/(home|admin)(\?|$)/, { timeout: 30000 }).catch(() => null);
    await submitButton.click();
    await redirected;

    const finalUrl = page.url();
    const formError = await page.locator('.form-error').first().textContent().catch(() => null);
    if (!/\/(home|admin)(\?|$)/.test(finalUrl)) {
      throw new Error(`Login did not redirect to /home or /admin. url=${finalUrl} error=${formError || 'none'}`);
    }

    if (/\/admin(\?|$)/.test(finalUrl)) {
      await page.waitForSelector('text=Console admin', { timeout: 15000 });
    } else {
      await page.waitForSelector('text=ESPACE MANAGER', { timeout: 15000 });
    }

    console.log('SMOKE_LOGIN_REDIRECT_OK');
    console.log(`url=${page.url()}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error('SMOKE_LOGIN_REDIRECT_FAIL');
  console.error(error.message || error);
  process.exit(1);
});
