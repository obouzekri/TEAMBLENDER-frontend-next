import { getPublicSiteOrigin, getSocialPreviewImage } from './siteMetadata.js';
import { SUPPORTED_LOCALES, stripLocaleFromPath, withLocalePath } from './i18n/routing.js';
import { TEAM_BUILDING_GUIDES } from './teamBuildingGuides.js';

export const PUBLIC_SEO_PATHS = [
  '/', '/pricing', '/contact', '/team-building',
  ...TEAM_BUILDING_GUIDES.map(({ slug }) => `/team-building/${slug}`),
];
export const PRIVATE_SEO_PATHS = [
  '/account', '/admin', '/challenges', '/home', '/participant', '/preferences',
  '/session-builder', '/session-live', '/session-results', '/resume',
];

export const PUBLIC_PAGE_COPY = {
  fr: {
    '/': {
      title: 'TeamBlender | Plateforme de team building pour managers et RH',
      description: 'Organisez un team building en présentiel, à distance ou en hybride : défis collaboratifs en direct, suivi de session et résultats pour le débrief.',
    },
    '/pricing': {
      title: 'Tarifs de la plateforme de team building',
      description: 'Comparez les offres TeamBlender pour vos sessions de team building. Essai gratuit de 14 jours, puis une formule adaptée aux besoins de votre équipe.',
    },
    '/contact': {
      title: 'Contact et démonstration de team building',
      description: 'Échangez avec TeamBlender pour organiser un team building adapté à vos objectifs RH : cohésion, onboarding et collaboration des équipes hybrides.',
    },
    '/team-building': {
      title: 'Team building en entreprise : fonctionnement et FAQ',
      description: 'Découvrez comment préparer, animer et débriefer une session TeamBlender en présentiel, à distance ou en hybride. Guide pour managers et équipes RH.',
    },
    ...Object.fromEntries(TEAM_BUILDING_GUIDES.map(({ slug, fr }) => [
      `/team-building/${slug}`, { title: fr.title, description: fr.description },
    ])),
  },
  en: {
    '/': {
      title: 'TeamBlender | Team building platform for managers and HR',
      description: 'Run in-person, remote or hybrid team building with live collaborative challenges, session tracking and results to support your team debrief.',
    },
    '/pricing': {
      title: 'Team building platform pricing',
      description: 'Compare TeamBlender plans for your team building sessions. Start with a 14-day free trial, then choose a plan that fits your team.',
    },
    '/contact': {
      title: 'Team building contact and demo',
      description: 'Talk to TeamBlender about team building for your HR goals: team cohesion, employee onboarding and collaboration across hybrid teams.',
    },
    '/team-building': {
      title: 'Corporate team building: how it works and FAQ',
      description: 'Learn how to prepare, facilitate and debrief a TeamBlender session in person, remotely or in a hybrid setting. A guide for managers and HR teams.',
    },
    ...Object.fromEntries(TEAM_BUILDING_GUIDES.map(({ slug, en }) => [
      `/team-building/${slug}`, { title: en.title, description: en.description },
    ])),
  },
};

export function isPublicSeoPath(pathname) {
  return PUBLIC_SEO_PATHS.includes(stripLocaleFromPath(pathname).replace(/\/+$/, '') || '/');
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
