import { CHALLENGE_CATALOG, CHALLENGE_CATALOG_BASE_PATH } from './i18n/challengeCatalogPaths.js';
import { getLocaleDictionary } from './i18n/index.js';

export { CHALLENGE_CATALOG, CHALLENGE_CATALOG_BASE_PATH };

export function getChallengeCatalogPath(slug) {
  return `${CHALLENGE_CATALOG_BASE_PATH}/${slug}`;
}

export const CHALLENGE_CATALOG_PATHS = [
  CHALLENGE_CATALOG_BASE_PATH,
  ...CHALLENGE_CATALOG.map(({ slug }) => getChallengeCatalogPath(slug)),
];

function clean(value) {
  return String(value || '').trim();
}

// Texte du hub et libellés ; null si la langue n'a pas de catalogue.
export function getChallengeCatalogHub(locale) {
  const catalog = getLocaleDictionary(locale)?.challengeCatalog;
  return catalog?.hub ? { ...catalog.hub, labels: catalog.labels } : null;
}

// Un défi : règles du jeu (challengeRules, partagées avec l'animateur) + présentation éditoriale.
// null si le slug est inconnu ou si la langue n'a pas ce défi (404 plutôt qu'un texte dans une autre langue).
export function getCatalogChallenge(slug, locale) {
  const entry = CHALLENGE_CATALOG.find((challenge) => challenge.slug === slug);
  const dictionary = getLocaleDictionary(locale);
  const item = entry && dictionary?.challengeCatalog?.items?.[entry.rulesKey];
  const rules = entry && dictionary?.challengeRules?.[entry.rulesKey];
  if (!item || !rules) return null;
  const participants = Object.fromEntries(['min', 'recommended', 'max']
    .map((key) => [key, clean(rules.participants?.[key])])
    .filter(([, value]) => value));
  return {
    ...item,
    slug,
    path: getChallengeCatalogPath(slug),
    name: clean(rules.challengeName),
    subtitle: clean(rules.subtitle),
    objective: clean(rules.objective),
    participants,
    participantRules: (Array.isArray(rules.participant) ? rules.participant : []).map(clean).filter(Boolean),
  };
}

export function getCatalogChallenges(locale) {
  return CHALLENGE_CATALOG.map(({ slug }) => getCatalogChallenge(slug, locale)).filter(Boolean);
}

// Métadonnées SEO (titre, description, sujets) des pages du catalogue pour lib/seo.js.
export function getChallengeCatalogPageCopy(locale) {
  const hub = getChallengeCatalogHub(locale);
  if (!hub) return {};
  return {
    [CHALLENGE_CATALOG_BASE_PATH]: { title: hub.seoTitle, description: hub.description, keywords: hub.keywords },
    ...Object.fromEntries(getCatalogChallenges(locale).map((challenge) => [
      challenge.path, { title: challenge.seoTitle, description: challenge.description, keywords: challenge.keywords },
    ])),
  };
}
