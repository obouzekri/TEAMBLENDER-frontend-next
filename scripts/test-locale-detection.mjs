import assert from 'node:assert/strict';
import { isBotUserAgent, localeFromAcceptLanguage, localeFromCountry, resolveLocale } from '../lib/i18n/detectLocale.js';
import { getPublicSeoRedirectPath } from '../lib/seo.js';

// Accept-Language : 1re langue supportée par ordre de préférence.
assert.equal(localeFromAcceptLanguage('fr-FR,fr;q=0.9,en;q=0.8'), 'fr');
assert.equal(localeFromAcceptLanguage('en-US,en;q=0.9,fr;q=0.8'), 'en');
assert.equal(localeFromAcceptLanguage('de-DE,de;q=0.9,en;q=0.7,fr;q=0.5'), 'en');
assert.equal(localeFromAcceptLanguage('fr;q=0.5,en;q=0.9'), 'en');
assert.equal(localeFromAcceptLanguage('en;q=0,fr'), 'fr');
assert.equal(localeFromAcceptLanguage('de-DE,de;q=0.9'), null);
assert.equal(localeFromAcceptLanguage('*'), null);
assert.equal(localeFromAcceptLanguage(''), null);
assert.equal(localeFromAcceptLanguage(null), null);

// Pays de l'IP en secours.
assert.equal(localeFromCountry('BE'), 'fr');
assert.equal(localeFromCountry('ma'), 'fr');
assert.equal(localeFromCountry('DE'), 'en');
assert.equal(localeFromCountry('XX'), null);
assert.equal(localeFromCountry('T1'), null);
assert.equal(localeFromCountry(''), null);

// Priorités : cookie > Accept-Language > pays > FR.
assert.equal(resolveLocale({ cookie: 'fr', acceptLanguage: 'en-US', country: 'US' }), 'fr');
assert.equal(resolveLocale({ cookie: 'en', acceptLanguage: 'fr-FR', country: 'FR' }), 'en');
assert.equal(resolveLocale({ cookie: 'de', acceptLanguage: 'fr-FR,fr;q=0.9,en;q=0.8' }), 'fr');
assert.equal(resolveLocale({ acceptLanguage: 'de-DE', country: 'CH' }), 'fr');
assert.equal(resolveLocale({ acceptLanguage: 'de-DE', country: 'DE' }), 'en');
assert.equal(resolveLocale({ acceptLanguage: 'de-DE' }), 'fr');
assert.equal(resolveLocale(), 'fr');

// Robots.
assert.equal(isBotUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'), true);
assert.equal(isBotUserAgent('Mozilla/5.0 (compatible; bingbot/2.0)'), true);
assert.equal(isBotUserAgent('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.1)'), true);
assert.equal(isBotUserAgent('facebookexternalhit/1.1'), true);
assert.equal(isBotUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'), false);
assert.equal(isBotUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'), false);

// Redirection des pages publiques sans préfixe vers la langue détectée.
assert.equal(getPublicSeoRedirectPath('/'), '/fr');
assert.equal(getPublicSeoRedirectPath('/', 'en'), '/en');
assert.equal(getPublicSeoRedirectPath('/pricing/', 'en'), '/en/pricing');
assert.equal(getPublicSeoRedirectPath('/en/pricing', 'fr'), null);
assert.equal(getPublicSeoRedirectPath('/home', 'en'), null);

console.log('locale detection tests passed');
