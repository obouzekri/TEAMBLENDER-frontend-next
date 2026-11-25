import assert from 'node:assert/strict';
import { buildPageMetadata, getLanguageAlternates, getPublicSeoLocales, getPublicSeoRedirectPath, getRobotsDisallowPaths, getRobotsRules, PRIVATE_SEO_PATHS, PUBLIC_PAGE_COPY, PUBLIC_SEO_PATHS } from '../lib/seo.js';
import { getPricingStructuredData, getPublicStructuredData } from '../lib/structuredData.js';
import { getPricingPlansFallback } from '../lib/pricingFallbackPlans.js';
import { HOME_FAQ_BY_LOCALE, TEAM_BUILDING_CONTENT } from '../lib/teamBuildingContent.js';
import { getTeamBuildingGuide } from '../lib/teamBuildingGuides.js';
import { SUPPORTED_LOCALES, getLocalizedPathRedirect, stripLocaleFromPath, withLocalePath } from '../lib/i18n/routing.js';

const previousEnvironment = process.env.VERCEL_ENV;
try {
  process.env.VERCEL_ENV = 'production';
  const productionRobotsRules = getRobotsRules();
  assert.deepEqual(productionRobotsRules.map(({ userAgent }) => userAgent), [
    '*',
    'OAI-SearchBot',
    'ChatGPT-User',
    'GPTBot',
    'ClaudeBot',
    'Claude-SearchBot',
    'PerplexityBot',
    'Google-Extended',
    'CCBot',
  ]);
  for (const rule of productionRobotsRules) {
    assert.equal(rule.allow, '/');
    assert.deepEqual(rule.disallow, getRobotsDisallowPaths());
  }
  for (const locale of SUPPORTED_LOCALES) {
    const titles = new Set();
    const descriptions = new Set();
    for (const path of PUBLIC_SEO_PATHS) {
      const copy = PUBLIC_PAGE_COPY[locale][path];
      const metadata = buildPageMetadata(withLocalePath(locale, path), locale);
      assert.ok(!titles.has(metadata.title.absolute), `Duplicate ${locale} title: ${path}`);
      assert.ok(!descriptions.has(copy.description), `Duplicate ${locale} description: ${path}`);
      titles.add(metadata.title.absolute);
      descriptions.add(copy.description);
      assert.equal(metadata.robots.index, true);
      assert.equal(metadata.alternates.canonical, getLanguageAlternates(path)[locale]);
      assert.equal(metadata.openGraph.url, metadata.alternates.canonical);
      // hreflang : seulement les langues qui ont cette page.
      assert.deepEqual(Object.keys(metadata.alternates.languages), [...getPublicSeoLocales(path), 'x-default']);
      assert.deepEqual(getPublicSeoLocales(path).slice(0, 2), ['fr', 'en']);
      assert.ok(copy.keywords.length >= 3 && copy.keywords.length <= 5);
      assert.equal(new Set(copy.keywords).size, copy.keywords.length);
      assert.ok(copy.keywords.every((keyword) => typeof keyword === 'string' && keyword.trim()));
      assert.equal(metadata.keywords, undefined, 'Do not use the obsolete meta keywords tag');
      if (path === '/') {
        assert.ok(copy.title.length <= 60, `Homepage title exceeds 60 characters for ${locale}`);
        if (locale === 'fr') {
          assert.equal(copy.title, "Cohésion d'équipe et team building en ligne | TeamBlender");
          assert.equal(copy.description, "Renforcez la cohésion d'équipe sur site ou à distance avec des moments collaboratifs de 15 à 35 min. Le complément de vos team buildings.");
          assert.equal(metadata.openGraph.title, copy.title);
          assert.equal(metadata.openGraph.description, copy.description);
          assert.equal(metadata.twitter.title, copy.title);
          assert.equal(metadata.twitter.description, copy.description);
        } else if (locale === 'en') {
          assert.ok(copy.description.length >= 150 && copy.description.length <= 160, `Homepage description length is out of range for ${locale}`);
        }
      }

      const data = getPublicStructuredData(path, locale);
      const webpage = data['@graph'].find((node) => ['WebPage', 'ContactPage'].includes(node['@type']));
      const expectedKeywords = path === '/' && locale === 'fr'
        ? copy.keywords.filter((keyword) => !/team[\s\-_]?building/i.test(keyword))
        : copy.keywords;
      assert.deepEqual(webpage.keywords, expectedKeywords);
      if (path === '/' && locale === 'fr') {
        assert.doesNotMatch(JSON.stringify(data), /team[\s\-_]?building/i);
      }
      if (path === '/demo') {
        const software = data['@graph'].find((node) => node['@type'] === 'SoftwareApplication');
        assert.equal(webpage.mainEntity['@id'], software['@id']);
      }
      const homepageFaq = data['@graph'].find((node) => node['@type'] === 'FAQPage');
      if (path === '/') {
        assert.equal(homepageFaq.mainEntity.length, HOME_FAQ_BY_LOCALE[locale].items.length);
        assert.deepEqual(
          homepageFaq.mainEntity.map(({ name, acceptedAnswer }) => ({ question: name, answer: acceptedAnswer.text })),
          HOME_FAQ_BY_LOCALE[locale].items.map(({ question, answer }) => ({ question, answer }))
        );
      } else {
        assert.equal(homepageFaq, undefined);
      }
      const article = data['@graph'].find((node) => node['@type'] === 'Article');
      const guide = path === '/team-building' ? TEAM_BUILDING_CONTENT[locale]
        : getTeamBuildingGuide(path.replace('/team-building/', ''), locale);
      if (guide) {
        if (locale === 'ar') {
          assert.match(guide.title, /[\u0600-\u06ff]/);
          assert.ok(guide.steps.every(({ title, text }) => /[\u0600-\u06ff]/.test(title) && /[\u0600-\u06ff]/.test(text)));
          assert.ok(guide.faq.every(({ question, answer }) => /[\u0600-\u06ff]/.test(question) && /[\u0600-\u06ff]/.test(answer)));
        }
        assert.equal(article.headline, guide.title);
        assert.equal(article.description, guide.intro);
        assert.deepEqual(article.keywords, copy.keywords);
        assert.equal(article.mainEntityOfPage['@id'], webpage['@id']);
        assert.equal(webpage.mainEntity['@id'], article['@id']);
        assert.equal(article.author['@id'], data['@graph'][0]['@id']);
        assert.deepEqual(article.articleSection, [guide.formatsTitle, guide.stepsTitle, guide.examplesTitle, guide.faqTitle]);
        assert.equal(article.datePublished, undefined, 'Do not invent publication dates');
      } else {
        assert.equal(article, undefined, 'Only editorial guides are articles');
      }
      assert.deepEqual(getPublicStructuredData(withLocalePath(locale, path), locale), data);
    }
    for (const path of [...PRIVATE_SEO_PATHS, '/login', '/reset-password', '/team-building/unknown']) {
      assert.equal(buildPageMetadata(path, locale).robots.index, false);
      assert.equal(getPublicStructuredData(path, locale), null);
    }
  }
  assert.equal(getPublicSeoRedirectPath('/'), '/fr');
  assert.equal(getPublicSeoRedirectPath('/pricing'), '/fr/pricing');
  assert.equal(getPublicSeoRedirectPath('/team-building/a-distance/'), '/fr/team-building/a-distance');
  assert.equal(getPublicSeoRedirectPath('/fr/pricing'), null);
  assert.equal(getPublicSeoRedirectPath('/en/pricing'), null);
  assert.equal(getPublicSeoRedirectPath('/login'), null);
  assert.equal(getPublicSeoRedirectPath('/team-building/unknown'), null);
  assert.ok(PUBLIC_PAGE_COPY.fr['/'].keywords.includes('organiser un team building'));
  assert.ok(PUBLIC_PAGE_COPY.fr['/'].keywords.includes('challenge entre équipes'));
  assert.ok(TEAM_BUILDING_CONTENT.fr.faq.some(({ question }) => question.includes('challenges entre équipes')));
  assert.equal(getTeamBuildingGuide('unknown', 'fr'), null);

  // URL traduites : l'anglais affiche « remote » / « hybrid », le français garde le chemin interne.
  assert.equal(withLocalePath('en', '/team-building/a-distance'), '/en/team-building/remote');
  assert.equal(withLocalePath('en', '/team-building/hybride'), '/en/team-building/hybrid');
  assert.equal(withLocalePath('fr', '/en/team-building/hybrid'), '/fr/team-building/hybride');
  assert.equal(stripLocaleFromPath('/en/team-building/remote'), '/team-building/a-distance');
  assert.equal(stripLocaleFromPath('/fr/team-building/remote'), '/team-building/remote');
  assert.equal(getLocalizedPathRedirect('en', '/team-building/a-distance'), '/team-building/remote');
  assert.equal(getLocalizedPathRedirect('en', '/team-building/remote'), null);
  assert.equal(getLocalizedPathRedirect('fr', '/team-building/a-distance'), null);
  assert.equal(getLanguageAlternates('/team-building/hybride').en, 'https://www.teamblender.io/en/team-building/hybrid');
  assert.equal(buildPageMetadata('/en/team-building/remote', 'en').alternates.canonical, 'https://www.teamblender.io/en/team-building/remote');

  // Image de partage dans la langue de la page.
  for (const locale of SUPPORTED_LOCALES) {
    const { openGraph, twitter } = buildPageMetadata(withLocalePath(locale, '/'), locale);
    assert.equal(openGraph.images[0].url, `https://www.teamblender.io/social-preview/${locale}.png`);
    assert.equal(twitter.images[0], openGraph.images[0].url);
  }
  assert.notEqual(buildPageMetadata('/fr', 'fr').openGraph.images[0].alt, buildPageMetadata('/en', 'en').openGraph.images[0].alt);

  // Offres de la page Tarifs : mêmes montants que la grille affichée.
  const offers = getPricingStructuredData(getPricingPlansFallback(), 'en');
  assert.equal(offers['@id'], 'https://www.teamblender.io/#software');
  assert.deepEqual(offers.offers.map(({ name, price, priceSpecification }) => [name, price, priceSpecification?.unitCode]), [
    ['Trial', 0, undefined], ['Essential', 39, 'MON'], ['Essential', 348, 'ANN'], ['Organisation', 1800, 'ANN'],
  ]);
  assert.ok(offers.offers.every((offer) => offer.priceCurrency === 'EUR' && offer.url === 'https://www.teamblender.io/en/pricing'));
  assert.equal(getPricingStructuredData(null, 'en'), null);
  const organization = getPublicStructuredData('/fr', 'fr')['@graph'][0];
  assert.equal(organization.contactPoint.email, 'contact@teamblender.io');

  process.env.VERCEL_ENV = 'preview';
  const previewRobotsRules = getRobotsRules();
  assert.deepEqual(previewRobotsRules.map(({ userAgent }) => userAgent), [
    '*',
    'OAI-SearchBot',
    'ChatGPT-User',
    'GPTBot',
    'ClaudeBot',
    'Claude-SearchBot',
    'PerplexityBot',
    'Google-Extended',
    'CCBot',
  ]);
  for (const rule of previewRobotsRules) {
    assert.equal(rule.allow, undefined);
    assert.equal(rule.disallow, '/');
  }
  for (const locale of SUPPORTED_LOCALES) {
    for (const path of PUBLIC_SEO_PATHS) {
      assert.equal(buildPageMetadata(path, locale).robots.index, false);
      assert.equal(getPublicStructuredData(path, locale), null);
    }
  }
  assert.equal(getPricingStructuredData(getPricingPlansFallback(), 'fr'), null);
} finally {
  if (previousEnvironment === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = previousEnvironment;
}
console.log('TEST_SEO_UNIT_OK');

if (process.argv.includes('--http')) {
  const { chromium } = await import('playwright');
  const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
  const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });
  try {
    const context = await browser.newContext({ javaScriptEnabled: false, userAgent: 'Googlebot' });
    const page = await context.newPage();
    const httpPaths = process.argv.includes('--guides')
      ? PUBLIC_SEO_PATHS.filter((path) => path.startsWith('/team-building/'))
      : PUBLIC_SEO_PATHS;
    for (const locale of SUPPORTED_LOCALES) {
      for (const path of httpPaths) {
        const route = withLocalePath(locale, path);
        const metadata = buildPageMetadata(route, locale);
        const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'load' });
        assert.equal(response.status(), 200, route);
        assert.equal(await page.locator('html').getAttribute('lang'), locale);
        assert.equal(await page.title(), metadata.title.absolute, route);
        assert.equal(await page.locator('head meta[name="description"]').getAttribute('content'), metadata.description);
        assert.equal(await page.locator('head link[rel="canonical"]').getAttribute('href'), metadata.alternates.canonical);
        assert.equal(await page.locator('head meta[property="og:url"]').getAttribute('content'), metadata.alternates.canonical);
        assert.equal(await page.locator('meta[name="keywords"]').count(), 0);
        assert.match(await page.locator('head meta[name="robots"]').getAttribute('content'), /^index, follow/);
        for (const [language, href] of Object.entries(metadata.alternates.languages)) {
          assert.equal(await page.locator(`head link[rel="alternate"][hreflang="${language}"]`).getAttribute('href'), href);
        }
        const nodes = (await page.locator('script[type="application/ld+json"]').allTextContents())
          .flatMap((text) => { const data = JSON.parse(text); return data['@graph'] || [data]; });
        const article = nodes.find((node) => node['@type'] === 'Article');
        if (path.startsWith('/team-building')) {
          assert.equal(await page.locator('h1').count(), 1);
          assert.equal(await page.locator('h1').innerText(), article.headline);
          const faq = nodes.find((node) => node['@type'] === 'FAQPage');
          assert.equal(await page.locator('article details').count(), faq.mainEntity.length);
          for (const [index, question] of faq.mainEntity.entries()) {
            const details = page.locator('article details').nth(index);
            assert.equal(await details.locator('summary').innerText(), question.name);
            await details.locator('summary').click();
            assert.equal(await details.locator('p').innerText(), question.acceptedAnswer.text);
          }
          assert.equal(await page.locator('#related-guides + ul a').count(), 3);
        } else {
          assert.equal(article, undefined);
        }
        if (path === '/') {
          const faq = nodes.find((node) => node['@type'] === 'FAQPage');
          assert.equal(await page.locator('main details').count(), faq.mainEntity.length);
          for (const [index, question] of faq.mainEntity.entries()) {
            const details = page.locator('main details').nth(index);
            assert.equal(await details.locator('summary').innerText(), question.name);
            // Answers may be collapsed: compare the DOM text, which crawlers read too.
            assert.equal((await details.locator('p').textContent()).trim(), question.acceptedAnswer.text);
          }
        }
      }
    }
    const sitemap = await context.request.get(`${baseUrl}/sitemap.xml`);
    assert.equal(sitemap.status(), 200);
    const xml = await sitemap.text();
    for (const locale of SUPPORTED_LOCALES) {
      for (const path of PUBLIC_SEO_PATHS) {
        assert.ok(xml.includes(`<loc>${getLanguageAlternates(path)[locale]}</loc>`), `Missing sitemap entry: ${locale}${path}`);
      }
    }
    const discovery = await context.request.get(`${baseUrl}/llms.txt`);
    assert.equal(discovery.status(), 200);
    const text = await discovery.text();
    for (const locale of SUPPORTED_LOCALES) {
      for (const path of PUBLIC_SEO_PATHS) {
        assert.ok(text.includes(PUBLIC_PAGE_COPY[locale][path].title), `Missing discovery title: ${locale}${path}`);
      }
    }
    assert.match(text, /## Key facts/);
    assert.match(text, /€39\/month/);
    for (const locale of SUPPORTED_LOCALES) {
      const image = await context.request.get(`${baseUrl}/social-preview/${locale}.png`);
      assert.equal(image.status(), 200);
      assert.equal(image.headers()['content-type'], 'image/png');
    }
    const oldGuide = await context.request.get(`${baseUrl}/en/team-building/a-distance`, { maxRedirects: 0 });
    assert.equal(oldGuide.status(), 308);
    assert.equal(new URL(oldGuide.headers().location, baseUrl).pathname, '/en/team-building/remote');
    await page.goto(`${baseUrl}/fr/demo`);
    assert.equal(await page.locator('h1').count(), 1);
    await page.goto(`${baseUrl}/en/pricing`);
    const pricingNodes = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((json) => JSON.parse(json));
    assert.ok(pricingNodes.some((node) => Array.isArray(node.offers) && node.offers.length > 0));
    const missing = await page.goto(`${baseUrl}/fr/team-building/unknown`);
    assert.equal(missing.status(), 404);
    assert.ok((await page.locator('meta[name="robots"]').evaluateAll((elements) => elements.map((element) => element.content))).some((value) => value.includes('noindex')));
    console.log('TEST_SEO_HTTP_OK: public pages without JavaScript, FAQ parity, sitemap, llms.txt and 404');
  } finally {
    await browser.close();
  }
}
