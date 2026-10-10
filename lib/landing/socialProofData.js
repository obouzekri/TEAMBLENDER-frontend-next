export const SOCIAL_PROOF_BY_LOCALE = {
  fr: {
    logos: [],
    testimonials: [],
  },
  en: {
    logos: [],
    testimonials: [],
  },
};

export function getSocialProofData(locale) {
  return SOCIAL_PROOF_BY_LOCALE[locale] || SOCIAL_PROOF_BY_LOCALE.fr;
}
