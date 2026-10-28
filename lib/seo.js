import { getPublicSiteOrigin, getSocialPreviewImage } from './siteMetadata.js';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, stripLocaleFromPath, withLocalePath } from './i18n/routing.js';
import { TEAM_BUILDING_GUIDES } from './teamBuildingGuides.js';

export const PUBLIC_SEO_PATHS = [
  '/', '/pricing', '/contact', '/team-building',
  ...TEAM_BUILDING_GUIDES.map(({ slug }) => `/team-building/${slug}`),
];
export const PRIVATE_SEO_PATHS = [
  '/account', '/admin', '/challenges', '/home', '/participant', '/preferences',
  '/session-builder', '/session-live', '/session-results', '/resume',
];
const GENERATIVE_AI_CRAWLERS = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'GPTBot',
  'ClaudeBot',
  'Claude-SearchBot',
  'PerplexityBot',
  'Google-Extended',
  'CCBot',
];

export const PUBLIC_PAGE_COPY = {
  fr: {
    '/': {
      title: "Cohésion d'équipe et team building en ligne | TeamBlender",
      description: "Renforcez la cohésion d'équipe sur site ou à distance avec des moments collaboratifs de 15 à 30 min. Le complément de vos team buildings.",
      keywords: ['organiser un team building', 'challenge entre équipes', 'team building en entreprise', 'jeux collaboratifs', 'cohésion d’équipe'],
    },
    '/pricing': {
      title: 'Tarifs de la plateforme de team building',
      description: 'Comparez les offres TeamBlender pour vos sessions de team building. Essai gratuit de 14 jours, puis une formule adaptée aux besoins de votre équipe.',
      keywords: ['tarif team building', 'prix plateforme team building', 'essai gratuit TeamBlender'],
    },
    '/contact': {
      title: 'Contact et démonstration de team building',
      description: 'Échangez avec TeamBlender pour organiser un team building adapté à vos objectifs RH : cohésion, onboarding et collaboration des équipes hybrides.',
      keywords: ['démonstration team building', 'organiser un team building en entreprise', 'contact TeamBlender'],
    },
    '/team-building': {
      title: 'Organiser un team building : guide et défis en équipe',
      description: 'Comment organiser un team building en entreprise ? Préparez vos défis entre équipes, animez la session et débriefez avec ce guide pour managers et RH.',
      keywords: ['comment organiser un team building', 'défis entre équipes', 'activités de cohésion', 'animer un team building'],
    },
    ...Object.fromEntries(TEAM_BUILDING_GUIDES.map(({ slug, fr }) => [
      `/team-building/${slug}`, { title: fr.seoTitle, description: fr.description, keywords: fr.keywords },
    ])),
  },
  en: {
    '/': {
      title: 'Team Cohesion and Online Team Building | TeamBlender',
      description: 'Strengthen team cohesion on-site or remotely with collaborative team moments of 15 to 30 minutes. The perfect complement to your team building events.',
      keywords: ['organise team building', 'team challenges', 'corporate team building', 'collaborative games', 'team cohesion'],
    },
    '/pricing': {
      title: 'Team building platform pricing',
      description: 'Compare TeamBlender plans for your team building sessions. Start with a 14-day free trial, then choose a plan that fits your team.',
      keywords: ['team building pricing', 'team building platform cost', 'TeamBlender free trial'],
    },
    '/contact': {
      title: 'Team building contact and demo',
      description: 'Talk to TeamBlender about team building for your HR goals: team cohesion, employee onboarding and collaboration across hybrid teams.',
      keywords: ['team building demo', 'organise corporate team building', 'contact TeamBlender'],
    },
    '/team-building': {
      title: 'How to organise team building: guide and team challenges',
      description: 'How do you organise corporate team building? Prepare team challenges, facilitate your session and debrief with this practical guide for managers and HR.',
      keywords: ['how to organise team building', 'team challenges', 'team bonding activities', 'facilitate team building'],
    },
    ...Object.fromEntries(TEAM_BUILDING_GUIDES.map(({ slug, en }) => [
      `/team-building/${slug}`, { title: en.seoTitle, description: en.description, keywords: en.keywords },
    ])),
  },
};

export function isPublicSeoPath(pathname) {
  return PUBLIC_SEO_PATHS.includes(stripLocaleFromPath(pathname).replace(/\/+$/, '') || '/');
}

export function getPublicSeoRedirectPath(pathname) {
  const firstSegment = String(pathname || '/').split('/').filter(Boolean)[0]?.toLowerCase();
  if (SUPPORTED_LOCALES.includes(firstSegment)) return null;

  const path = String(pathname || '/').replace(/\/+$/, '') || '/';
  return isPublicSeoPath(path) ? withLocalePath(DEFAULT_LOCALE, path) : null;
}

export function isPreviewEnvironment() {
  return process.env.VERCEL_ENV === 'preview';
}

export function getLanguageAlternates(path) {
  const origin = getPublicSiteOrigin();
  return {
    fr: `${origin}${withLocalePath('fr', path)}`,
    en: `${origin}${withLocalePath('en', path)}`,
    'x-default': `${origin}${withLocalePath('fr', path)}`,
  };
}

export function buildPageMetadata(pathname, locale) {
  const path = stripLocaleFromPath(pathname).replace(/\/+$/, '') || '/';
  const copy = PUBLIC_PAGE_COPY[locale]?.[path];
  const index = Boolean(copy) && !isPreviewEnvironment();
  if (!copy) return { robots: { index: false, follow: false } };

  const image = getSocialPreviewImage();
  const canonical = getLanguageAlternates(path)[locale];
  return {
    title: { absolute: copy.title.includes('TeamBlender') ? copy.title : `${copy.title} | TeamBlender` },
    description: copy.description,
    alternates: { canonical, languages: getLanguageAlternates(path) },
    robots: {
      index,
      follow: true,
      googleBot: { index, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      siteName: 'TeamBlender',
      type: 'website',
      url: canonical,
      locale: locale === 'en' ? 'en_US' : 'fr_FR',
      alternateLocale: [locale === 'en' ? 'fr_FR' : 'en_US'],
      images: [image],
    },
    twitter: { card: 'summary_large_image', title: copy.title, description: copy.description, images: [image.url] },
  };
}

export function getRobotsDisallowPaths() {
  const paths = [...PRIVATE_SEO_PATHS, '/api', '/uploads', '/socket.io', '/ingest'];
  return [...paths, ...SUPPORTED_LOCALES.flatMap((locale) => paths.map((path) => `/${locale}${path}`))];
}

export function getRobotsRules() {
  const accessRules = isPreviewEnvironment()
    ? { disallow: '/' }
    : { allow: '/', disallow: getRobotsDisallowPaths() };

  return [
    { userAgent: '*', ...accessRules },
    ...GENERATIVE_AI_CRAWLERS.map((userAgent) => ({ userAgent, ...accessRules })),
  ];
}
