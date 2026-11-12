// Keep in sync with backend/src/config/canonical-pricing-plans.js; test-pricing-display.mjs checks the contract.
export const FALLBACK_PRICING_PLANS = Object.freeze([
  {
    id: 'trial', plan_code: 'trial', slug: 'teamblender-trial', name: 'Essai', description: 'Accès gratuit pendant 30 jours.',
    features: ['all_challenges'], price_cents: 0, annual_price_cents: 0, currency: 'EUR', billing_cycle: 'monthly',
    cta_label: 'Commencer l’essai', is_active: true, is_fallback: true, highlighted: false, max_users: 20, max_sessions_per_month: null,
    trial_days: 30, display_order: 1, annual_discount_percentage: 0,
    localized_content: {
      fr: { name: 'Essai', description: 'Accès gratuit pendant 30 jours.', price_label: 'Gratuit pendant 30 jours', features: ['Jusqu’à 20 participants', 'Tous les défis', 'Sans carte bancaire'], cta_label: 'Commencer l’essai' },
      en: { name: 'Trial', description: 'Free access for 30 days.', price_label: 'Free for 30 days', features: ['Up to 20 participants', 'All challenges', 'No credit card'], cta_label: 'Start trial' },
      ar: { name: 'تجربة', description: 'وصول مجاني لمدة 30 يومًا.', price_label: 'مجانًا لمدة 30 يومًا', features: ['حتى 20 مشاركًا', 'جميع التحديات', 'من دون بطاقة مصرفية'], cta_label: 'ابدأ التجربة' },
    },
  },
  {
    id: 'team', plan_code: 'team', slug: 'teamblender-team', name: 'Équipe', description: 'Une équipe, jusqu’à 25 participants.',
    features: ['all_challenges'], price_cents: 3900, annual_price_cents: 34800, currency: 'EUR', billing_cycle: 'monthly',
    cta_label: 'Demander l’activation', is_active: true, is_fallback: true, highlighted: true, max_users: 25, max_sessions_per_month: null,
    trial_days: null, display_order: 2, annual_discount_percentage: 25,
    localized_content: {
      fr: { name: 'Équipe', description: 'Une équipe, jusqu’à 25 participants.', price_monthly_label: '39 €/mois', price_annual_label: '29 €/mois, facturé annuellement', price_secondary_label: 'ou 39 € au mois', features: ['1 équipe jusqu’à 25 participants', 'Sessions illimitées', 'Indicateurs de participation'], cta_label: 'Demander l’activation' },
      en: { name: 'Team', description: 'One team, up to 25 participants.', price_monthly_label: '€39/month', price_annual_label: '€29/month, billed annually', price_secondary_label: 'or €39 month-to-month', features: ['1 team up to 25 participants', 'Unlimited sessions', 'Participation insights'], cta_label: 'Request activation' },
      ar: { name: 'فريق', description: 'فريق واحد، حتى 25 مشاركًا.', price_monthly_label: '39 يورو شهريًا', price_annual_label: '29 يورو شهريًا، تُدفع سنويًا', price_secondary_label: 'أو 39 يورو شهريًا', features: ['فريق واحد حتى 25 مشاركًا', 'جلسات غير محدودة', 'مؤشرات المشاركة'], cta_label: 'اطلب التفعيل' },
    },
  },
  {
    id: 'enterprise', plan_code: 'enterprise', slug: 'teamblender-enterprise', name: 'Entreprise', description: 'Une offre adaptée aux organisations multi-sites.',
    features: ['all_challenges'], price_cents: 180000, annual_price_cents: null, currency: 'EUR', billing_cycle: 'custom',
    cta_label: 'Demander une démo', is_active: true, is_fallback: true, highlighted: false, max_users: 100, max_sessions_per_month: null,
    trial_days: null, display_order: 3, annual_discount_percentage: 0,
    localized_content: {
      fr: { name: 'Entreprise', description: 'Une offre adaptée aux organisations multi-sites.', price_label: 'À partir de 1 800 €/an', price_secondary_label: 'Sur devis', features: ['Plusieurs équipes et sites', 'Tableau de bord par site', 'Première session animée avec vous', 'Facturation annuelle par virement'], cta_label: 'Demander une démo', badge: 'Multi-sites' },
      en: { name: 'Enterprise', description: 'A plan for multi-location organizations.', price_label: 'From €1,800/year', price_secondary_label: 'Custom quote', features: ['Multiple teams and locations', 'Dashboard by location', 'First session facilitated with you', 'Annual bank transfer invoicing'], cta_label: 'Request a demo', badge: 'Multi-site' },
      ar: { name: 'مؤسسات', description: 'باقة مخصصة للمؤسسات متعددة المواقع.', price_label: 'ابتداءً من 1,800 يورو سنويًا', price_secondary_label: 'عرض سعر مخصص', features: ['فرق ومواقع متعددة', 'لوحة معلومات لكل موقع', 'جلسة أولى بإشراف فريقنا', 'فاتورة سنوية عبر تحويل مصرفي'], cta_label: 'اطلب عرضًا تجريبيًا', badge: 'متعدد المواقع' },
    },
  },
]);

export function getPricingPlansFallback() {
  return FALLBACK_PRICING_PLANS.map((plan) => ({ ...plan }));
}
