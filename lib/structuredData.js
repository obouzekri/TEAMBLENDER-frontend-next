import { getPublicSiteOrigin } from './siteMetadata.js';
import { getLanguageAlternates, getPublicSeoLocales, isPreviewEnvironment, PUBLIC_PAGE_COPY } from './seo.js';
import { stripLocaleFromPath } from './i18n/routing.js';
import { HOME_FAQ_BY_LOCALE, TEAM_BUILDING_CONTENT } from './teamBuildingContent.js';
import { getTeamBuildingGuide } from './teamBuildingGuides.js';
import { pickLocalized, translate } from './i18n/index.js';

export const CONTACT_EMAIL = 'contact@teamblender.io';

// Données structurées propres à l'accueil, par langue (sans entrée : titre et description de la page).
const HOME_STRUCTURED_OVERRIDES = {
  fr: {
    title: 'TeamBlender | Des moments pour renforcer la cohésion d’équipe',
    description: 'Des défis collaboratifs et des moments réguliers pour renforcer la cohésion des équipes, sur site ou à distance.',
    withoutTeamBuildingKeywords: true,
  },
};

export function getPublicStructuredData(pathname, locale) {
  const path = stripLocaleFromPath(pathname).replace(/\/+$/, '') || '/';
  const copy = PUBLIC_PAGE_COPY[locale]?.[path];
  if (!copy || isPreviewEnvironment()) return null;

  const origin = getPublicSiteOrigin();
  const url = getLanguageAlternates(path)[locale];
  const home = getLanguageAlternates('/')[locale];
  const guide = path === '/team-building'
    ? TEAM_BUILDING_CONTENT[locale]
    : path.startsWith('/team-building/')
      ? getTeamBuildingGuide(path.slice('/team-building/'.length), locale)
      : null;
  const homeOverride = path === '/' ? HOME_STRUCTURED_OVERRIDES[locale] : null;
  const structuredTitle = homeOverride?.title ?? copy.title;
  const structuredDescription = homeOverride?.description ?? copy.description;
  const structuredKeywords = homeOverride?.withoutTeamBuildingKeywords
    ? copy.keywords.filter((keyword) => !/team[\s\-_]?building/i.test(keyword))
    : copy.keywords;
  const breadcrumbs = [{ name: translate(locale, 'shell.breadcrumbHome'), item: home }];
  if (path.startsWith('/team-building/')) {
    breadcrumbs.push({
      name: translate(locale, 'shell.breadcrumbTeamBuildingGuide'),
      item: getLanguageAlternates('/team-building')[locale],
    });
  }
  if (path !== '/') breadcrumbs.push({ name: copy.title, item: url });

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${origin}/#organization`,
        name: 'TeamBlender',
        url: origin,
        logo: `${origin}/teamblender-nav-logo.png`,
        email: CONTACT_EMAIL,
        sameAs: ['https://www.linkedin.com/company/teamblender/'],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: CONTACT_EMAIL,
          url: getLanguageAlternates('/contact')[locale],
          availableLanguage: getPublicSeoLocales(),
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        name: 'TeamBlender',
        url: origin,
        inLanguage: getPublicSeoLocales(),
        publisher: { '@id': `${origin}/#organization` },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${origin}/#software`,
        name: 'TeamBlender',
        url: home,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        inLanguage: getPublicSeoLocales(),
        description: homeOverride ? structuredDescription : PUBLIC_PAGE_COPY[locale]['/'].description,
        publisher: { '@id': `${origin}/#organization` },
      },
      {
        '@type': path === '/contact' ? 'ContactPage' : 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: structuredTitle,
        description: structuredDescription,
        keywords: structuredKeywords,
        inLanguage: locale,
        isPartOf: { '@id': `${origin}/#website` },
        about: { '@id': `${origin}/#software` },
        ...(guide ? { mainEntity: { '@id': `${url}#article` } } : {}),
        ...(path === '/demo' ? { mainEntity: { '@id': `${origin}/#software` } } : {}),
        ...(path !== '/' ? { breadcrumb: { '@id': `${url}#breadcrumb` } } : {}),
      },
      ...(guide ? [{
        '@type': 'Article',
        '@id': `${url}#article`,
        url,
        headline: guide.title,
        description: guide.intro,
        inLanguage: locale,
        keywords: copy.keywords,
        articleSection: [guide.formatsTitle, guide.stepsTitle, guide.examplesTitle, guide.faqTitle],
        mainEntityOfPage: { '@id': `${url}#webpage` },
        author: { '@id': `${origin}/#organization` },
        publisher: { '@id': `${origin}/#organization` },
        about: { '@id': `${origin}/#software` },
      }] : []),
      ...(path === '/' ? [{
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        inLanguage: locale,
        isPartOf: { '@id': `${url}#webpage` },
        mainEntity: HOME_FAQ_BY_LOCALE[locale].items.map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      }] : []),
      ...(path === '/' ? [] : [{
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: breadcrumbs.map((item, index) => ({
          '@type': 'ListItem', position: index + 1, ...item,
        })),
      }]),
    ],
  };
}

function toPrice(cents) {
  return Number.isFinite(Number(cents)) && cents !== null ? Number(cents) / 100 : null;
}

// Offres de la page Tarifs, construites à partir des plans affichés (mêmes prix que le HTML).
// Le nœud reprend l'@id du logiciel publié par le layout : les moteurs fusionnent les deux.
export function getPricingStructuredData(plans, locale) {
  if (isPreviewEnvironment() || !Array.isArray(plans)) return null;
  const origin = getPublicSiteOrigin();
  const url = getLanguageAlternates('/pricing')[locale];
  const offers = plans.filter((plan) => plan?.is_active !== false).flatMap((plan) => {
    const content = pickLocalized(plan.localized_content, locale) || {};
    const name = content.name || plan.name;
    const description = content.description || plan.description;
    const currency = plan.currency || 'EUR';
    const monthly = toPrice(plan.price_cents);
    const annual = toPrice(plan.annual_price_cents);
    const base = { '@type': 'Offer', url, priceCurrency: currency, availability: 'https://schema.org/InStock', description };
    if (monthly === null) return [];
    if (plan.billing_cycle === 'custom') {
      return [{ ...base, name, price: monthly, priceSpecification: { '@type': 'UnitPriceSpecification', minPrice: monthly, priceCurrency: currency, unitCode: 'ANN' } }];
    }
    if (monthly === 0) return [{ ...base, name, price: 0 }];
    return [
      { ...base, name, price: monthly, priceSpecification: { '@type': 'UnitPriceSpecification', price: monthly, priceCurrency: currency, unitCode: 'MON' } },
      ...(annual ? [{ ...base, name, price: annual, priceSpecification: { '@type': 'UnitPriceSpecification', price: annual, priceCurrency: currency, unitCode: 'ANN' } }] : []),
    ];
  });
  if (!offers.length) return null;
  return { '@context': 'https://schema.org', '@type': 'SoftwareApplication', '@id': `${origin}/#software`, name: 'TeamBlender', offers };
}
