import { getPublicSiteOrigin } from './siteMetadata.js';
import { getLanguageAlternates, getPublicSeoLocales, isPreviewEnvironment, PUBLIC_PAGE_COPY } from './seo.js';
import { stripLocaleFromPath } from './i18n/routing.js';
import { HOME_FAQ_BY_LOCALE, TEAM_BUILDING_CONTENT } from './teamBuildingContent.js';
import { getTeamBuildingGuide } from './teamBuildingGuides.js';
import { translate } from './i18n/index.js';

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
        sameAs: ['https://www.linkedin.com/company/teamblender/'],
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
