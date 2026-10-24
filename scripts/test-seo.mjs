import assert from 'node:assert/strict';
import { buildPageMetadata, getLanguageAlternates, getRobotsDisallowPaths, getRobotsRules, PRIVATE_SEO_PATHS, PUBLIC_PAGE_COPY, PUBLIC_SEO_PATHS } from '../lib/seo.js';
import { getPublicStructuredData } from '../lib/structuredData.js';
import { HOME_FAQ_BY_LOCALE, TEAM_BUILDING_CONTENT } from '../lib/teamBuildingContent.js';
import { getTeamBuildingGuide } from '../lib/teamBuildingGuides.js';
import { withLocalePath } from '../lib/i18n/routing.js';

const previousEnvironment = process.env.VERCEL_ENV;
try {
  process.env.VERCEL_ENV = 'production';
  const productionRobotsRules = getRobotsRules();
  assert.deepEqual(productionRobotsRules.map(({ userAgent }) => userAgent), ['*', 'GPTBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended']);
  for (const rule of productionRobotsRules) {
    assert.equal(rule.allow, '/');
    assert.deepEqual(rule.disallow, getRobotsDisallowPaths());
  }
  for (const locale of ['fr', 'en']) {
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
      assert.deepEqual(Object.keys(metadata.alternates.languages), ['fr', 'en', 'x-default']);
      assert.ok(copy.keywords.length >= 3 && copy.keywords.length <= 5);
      assert.equal(new Set(copy.keywords).size, copy.keywords.length);
      assert.ok(copy.keywords.every((keyword) => typeof keyword === 'string' && keyword.trim()));
      assert.equal(metadata.keywords, undefined, 'Do not use the obsolete meta keywords tag');
      if (path === '/') {
        assert.ok(copy.title.length <= 60, `Homepage title exceeds 60 characters for ${locale}`);
        assert.ok(copy.description.length >= 150 && copy.description.length <= 160, `Homepage description length is out of range for ${locale}`);
      }

      const data = getPublicStructuredData(path, locale);
      const webpage = data['@graph'].find((node) => ['WebPage', 'ContactPage'].includes(node['@type']));
      assert.deepEqual(webpage.keywords, copy.keywords);
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
  assert.ok(PUBLIC_PAGE_COPY.fr['/'].keywords.includes('organiser un team building'));
  assert.ok(PUBLIC_PAGE_COPY.fr['/'].keywords.includes('challenge entre équipes'));
  assert.ok(TEAM_BUILDING_CONTENT.fr.faq.some(({ question }) => question.includes('challenges entre équipes')));
  assert.equal(getTeamBuildingGuide('unknown', 'fr'), null);

  process.env.VERCEL_ENV = 'preview';
  const previewRobotsRules = getRobotsRules();
  assert.deepEqual(previewRobotsRules.map(({ userAgent }) => userAgent), ['*', 'GPTBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended']);
  for (const rule of previewRobotsRules) {
    assert.equal(rule.allow, undefined);
    assert.equal(rule.disallow, '/');
  }
  for (const locale of ['fr', 'en']) {
    for (const path of PUBLIC_SEO_PATHS) {
      assert.equal(buildPageMetadata(path, locale).robots.index, false);
      assert.equal(getPublicStructuredData(path, locale), null);
    }
  }
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
    for (const locale of ['fr', 'en']) {
      for (const path of PUBLIC_SEO_PATHS) {
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
            assert.equal(await details.locator('p').innerText(), question.acceptedAnswer.text);
          }
        }
      }
    }
    const sitemap = await context.request.get(`${baseUrl}/sitemap.xml`);
    assert.equal(sitemap.status(), 200);
    const xml = await sitemap.text();
    for (const locale of ['fr', 'en']) {
      for (const path of PUBLIC_SEO_PATHS) {
        assert.ok(xml.includes(`<loc>${getLanguageAlternates(path)[locale]}</loc>`), `Missing sitemap entry: ${locale}${path}`);
      }
    }
    const discovery = await context.request.get(`${baseUrl}/llms.txt`);
    assert.equal(discovery.status(), 200);
    const text = await discovery.text();
    for (const locale of ['fr', 'en']) {
      for (const path of PUBLIC_SEO_PATHS) {
        assert.ok(text.includes(PUBLIC_PAGE_COPY[locale][path].title), `Missing discovery title: ${locale}${path}`);
      }
    }
    const missing = await page.goto(`${baseUrl}/fr/team-building/unknown`);
    assert.equal(missing.status(), 404);
    assert.ok((await page.locator('meta[name="robots"]').evaluateAll((elements) => elements.map((element) => element.content))).some((value) => value.includes('noindex')));
    console.log('TEST_SEO_HTTP_OK: 14 public pages without JavaScript, FAQ parity, sitemap, llms.txt and 404');
  } finally {
    await browser.close();
  }
}
