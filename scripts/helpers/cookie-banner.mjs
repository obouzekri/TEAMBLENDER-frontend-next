import fr from '../../lib/i18n/dictionaries/fr/cookieConsent.js';
import en from '../../lib/i18n/dictionaries/en/cookieConsent.js';
import ar from '../../lib/i18n/dictionaries/ar/cookieConsent.js';

const refuseLabels = [fr.refuse, en.refuse, ar.refuse];

/**
 * Refuse analytics cookies when the consent banner is shown.
 *
 * The banner only renders when a tracking tool is configured (hasTrackingStackConfigured),
 * which is usually not the case locally or in CI: tests must not require it.
 * It renders after mount, so wait briefly before deciding it is absent.
 */
export async function dismissCookieBanner(page, { timeout = 3000 } = {}) {
  const button = page.getByRole('button', { name: new RegExp(`^(${refuseLabels.map(escapeRegExp).join('|')})$`) });
  try {
    await button.first().waitFor({ state: 'visible', timeout });
  } catch {
    return false;
  }
  await button.first().click();
  return true;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
