import { getPublicSiteOrigin, getSocialPreviewImage } from './siteMetadata.js';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, getLocaleMeta, stripLocaleFromPath, withLocalePath } from './i18n/routing.js';
import { TEAM_BUILDING_GUIDES } from './teamBuildingGuides.js';

export const PUBLIC_SEO_PATHS = [
  '/', '/pricing', '/contact', '/demo', '/team-building',
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
      description: "Renforcez la cohésion d'équipe sur site ou à distance avec des moments collaboratifs de 15 à 35 min. Le complément de vos team buildings.",
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
    '/demo': {
      title: 'Démo interactive de team building | TeamBlender',
      description: 'Explorez une session de team building en ligne : préparez une équipe, découvrez des défis collaboratifs et consultez un bilan, sans inscription.',
      keywords: ['démo team building', 'défis collaboratifs en ligne', 'cohésion d’équipe', 'plateforme team building'],
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
      description: 'Strengthen team cohesion on-site or remotely with collaborative team moments of 15 to 35 minutes. The perfect complement to your team building events.',
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
    '/demo': {
      title: 'Interactive team building demo | TeamBlender',
      description: 'Explore an online team building session: prepare a team, try collaborative challenges and view a results recap, with no signup required.',
      keywords: ['team building demo', 'online team challenges', 'team cohesion activities', 'team building platform'],
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
  // Guides team building pas encore traduits : seulement les pages principales.
  ar: {
    '/': {
      title: 'تماسك الفريق وبناء الفريق عبر الإنترنت | TeamBlender',
      description: 'عزّز تماسك فريقك في الموقع أو عن بُعد بلحظات تعاونية من 15 إلى 35 دقيقة. المكمّل المثالي لأنشطة بناء الفريق.',
      keywords: ['تنظيم بناء الفريق', 'تحديات جماعية', 'بناء الفريق في الشركات', 'ألعاب تعاونية', 'تماسك الفريق'],
    },
    '/pricing': {
      title: 'أسعار منصة بناء الفريق',
      description: 'قارن باقات TeamBlender لجلسات بناء الفريق. ابدأ بتجربة مجانية لمدة 14 يومًا، ثم اختر الباقة المناسبة لفريقك.',
      keywords: ['أسعار بناء الفريق', 'تكلفة منصة بناء الفريق', 'تجربة TeamBlender المجانية'],
    },
    '/contact': {
      title: 'التواصل وعرض توضيحي لبناء الفريق',
      description: 'تحدّث مع TeamBlender لتنظيم بناء فريق يناسب أهداف الموارد البشرية لديك: التماسك والإدماج والتعاون بين الفرق الهجينة.',
      keywords: ['عرض توضيحي لبناء الفريق', 'تنظيم بناء الفريق في الشركات', 'التواصل مع TeamBlender'],
    },
    '/demo': {
      title: 'عرض تفاعلي لبناء الفريق | TeamBlender',
      description: 'استكشف جلسة بناء فريق عبر الإنترنت: حضّر فريقًا، واكتشف تحديات تعاونية، واطّلع على الحصيلة، دون تسجيل.',
      keywords: ['عرض بناء الفريق', 'تحديات جماعية عبر الإنترنت', 'أنشطة تماسك الفريق', 'منصة بناء الفريق'],
    },
  },
};

export function isPublicSeoPath(pathname) {
  return PUBLIC_SEO_PATHS.includes(stripLocaleFromPath(pathname).replace(/\/+$/, '') || '/');
}

export function getPublicSeoRedirectPath(pathname, locale = DEFAULT_LOCALE) {
  const firstSegment = String(pathname || '/').split('/').filter(Boolean)[0]?.toLowerCase();
  if (SUPPORTED_LOCALES.includes(firstSegment)) return null;

  const path = String(pathname || '/').replace(/\/+$/, '') || '/';
  return isPublicSeoPath(path) ? withLocalePath(locale, path) : null;
}

export function isPreviewEnvironment() {
  return process.env.VERCEL_ENV === 'preview';
}

// Langues dont les pages publiques ont un contenu SEO ; avec `path`, celles qui ont cette page
// (l'arabe n'a pas encore les guides team building : pas de hreflang ni de sitemap pour eux).
export function getPublicSeoLocales(path) {
  return SUPPORTED_LOCALES.filter((locale) => (path ? PUBLIC_PAGE_COPY[locale]?.[path] : PUBLIC_PAGE_COPY[locale]));
}

export function getLanguageAlternates(path) {
  const origin = getPublicSiteOrigin();
  const languages = Object.fromEntries(
    getPublicSeoLocales(path).map((locale) => [locale, `${origin}${withLocalePath(locale, path)}`]),
  );
  return { ...languages, 'x-default': `${origin}${withLocalePath(DEFAULT_LOCALE, path)}` };
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
      locale: getLocaleMeta(locale).ogLocale,
      alternateLocale: getPublicSeoLocales(path).filter((other) => other !== locale).map((other) => getLocaleMeta(other).ogLocale),
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
