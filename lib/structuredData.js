import { getPublicSiteOrigin } from './siteMetadata.js';
import { getLanguageAlternates, isPreviewEnvironment, PUBLIC_PAGE_COPY } from './seo.js';
import { stripLocaleFromPath } from './i18n/routing.js';
import { HOME_FAQ_BY_LOCALE, TEAM_BUILDING_CONTENT } from './teamBuildingContent.js';
import { getTeamBuildingGuide } from './teamBuildingGuides.js';

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
  const structuredTitle = path === '/' && locale === 'fr'
    ? 'TeamBlender | Des moments pour renforcer la cohésion d’équipe'
    : copy.title;
  const structuredDescription = path === '/' && locale === 'fr'
    ? 'Des défis collaboratifs et des moments réguliers pour renforcer la cohésion des équipes, sur site ou à distance.'
    : copy.description;
  const structuredKeywords = path === '/' && locale === 'fr'
    ? copy.keywords.filter((keyword) => !/team[\s\-_]?building/i.test(keyword))
    : copy.keywords;
  const breadcrumbs = [{ name: locale === 'en' ? 'Home' : 'Accueil', item: home }];
  if (path.startsWith('/team-building/')) {
    breadcrumbs.push({
      name: locale === 'en' ? 'Team building guide' : 'Guide du team building',
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
        inLanguage: ['fr', 'en'],
        publisher: { '@id': `${origin}/#organization` },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${origin}/#software`,
        name: 'TeamBlender',
        url: home,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        inLanguage: ['fr', 'en'],
        description: path === '/' && locale === 'fr' ? structuredDescription : PUBLIC_PAGE_COPY[locale]['/'].description,
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
