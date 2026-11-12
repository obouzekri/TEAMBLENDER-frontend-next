// Keep in sync with backend/src/config/canonical-pricing-plans.js; test-pricing-display.mjs checks the contract.
export const FALLBACK_PRICING_PLANS = Object.freeze([
  {
    id: 'trial', plan_code: 'trial', slug: 'teamblender-trial', name: 'Essai', description: 'Pour tester avec une première équipe.',
    features: ['all_challenges'], price_cents: 0, annual_price_cents: 0, currency: 'EUR', billing_cycle: 'monthly',
    cta_label: 'Commencer l’essai', is_active: true, is_fallback: true, highlighted: false, max_users: 20, max_sessions_per_month: null,
    trial_days: 30, display_order: 1, annual_discount_percentage: 0,
    localized_content: {
      fr: { name: 'Essai', description: 'Pour tester avec une première équipe.', price_label: '0 €', price_secondary_label: 'pendant 30 jours', features: ['Jusqu’à 20 participants', 'Tous les défis', 'Sans carte bancaire'], cta_label: 'Commencer l’essai' },
      en: { name: 'Trial', description: 'To try it out with a first team.', price_label: '€0', price_secondary_label: 'for 30 days', features: ['Up to 20 participants', 'All challenges', 'No credit card'], cta_label: 'Start trial' },
      ar: { name: 'تجربة', description: 'لتجربة المنصة مع فريق أول.', price_label: '0 يورو', price_secondary_label: 'لمدة 30 يومًا', features: ['حتى 20 مشاركًا', 'جميع التحديات', 'من دون بطاقة مصرفية'], cta_label: 'ابدأ التجربة' },
    },
  },
  {
    id: 'team', plan_code: 'team', slug: 'teamblender-team', name: 'Équipe', description: 'Pour un manager ou un RH et son équipe.',
    features: ['all_challenges'], price_cents: 3900, annual_price_cents: 34800, currency: 'EUR', billing_cycle: 'monthly',
    cta_label: 'Demander l’activation', is_active: true, is_fallback: true, highlighted: true, max_users: 25, max_sessions_per_month: null,
    trial_days: null, display_order: 2, annual_discount_percentage: 25,
    localized_content: {
      fr: { name: 'Équipe', description: 'Pour un manager ou un RH et son équipe.', price_monthly_label: '39 €/mois', price_annual_label: '29 €/mois', price_secondary_label: 'facturé 348 €/an, ou 39 € au mois', features: ['Jusqu’à 25 participants dans l’équipe', 'Sessions illimitées', 'Indicateurs de participation'], cta_label: 'Demander l’activation', badge: 'Recommandé' },
      en: { name: 'Team', description: 'For a manager or HR lead and their team.', price_monthly_label: '€39/month', price_annual_label: '€29/month', price_secondary_label: 'billed €348/year, or €39 month-to-month', features: ['Up to 25 participants in the team', 'Unlimited sessions', 'Participation insights'], cta_label: 'Request activation', badge: 'Recommended' },
      ar: { name: 'فريق', description: 'لمدير أو مسؤول موارد بشرية وفريقه.', price_monthly_label: '39 يورو شهريًا', price_annual_label: '29 يورو شهريًا', price_secondary_label: 'تُدفع 348 يورو سنويًا، أو 39 يورو شهريًا', features: ['حتى 25 مشاركًا في الفريق', 'جلسات غير محدودة', 'مؤشرات المشاركة'], cta_label: 'اطلب التفعيل', badge: 'موصى به' },
    },
  },
  {
    id: 'enterprise', plan_code: 'enterprise', slug: 'teamblender-enterprise', name: 'Entreprise', description: 'Pour plusieurs équipes et plusieurs sites.',
    features: ['all_challenges'], price_cents: 180000, annual_price_cents: null, currency: 'EUR', billing_cycle: 'custom',
    cta_label: 'Demander une démo', is_active: true, is_fallback: true, highlighted: false, max_users: 100, max_sessions_per_month: null,
    trial_days: null, display_order: 3, annual_discount_percentage: 0,
    localized_content: {
      fr: { name: 'Entreprise', description: 'Pour plusieurs équipes et plusieurs sites.', price_label: '1 800 €/an', price_prefix_label: 'À partir de', price_secondary_label: 'sur devis, facturation annuelle', features: ['Plusieurs équipes et sites', 'Tableau de bord par site', 'Première session animée avec vous', 'Facturation annuelle par virement'], cta_label: 'Demander une démo', badge: 'Multi-sites' },
      en: { name: 'Enterprise', description: 'For several teams and locations.', price_label: '€1,800/year', price_prefix_label: 'From', price_secondary_label: 'custom quote, billed annually', features: ['Multiple teams and locations', 'Dashboard by location', 'First session facilitated with you', 'Annual bank transfer invoicing'], cta_label: 'Request a demo', badge: 'Multi-site' },
      ar: { name: 'مؤسسات', description: 'لعدة فرق وعدة مواقع.', price_label: '1,800 يورو سنويًا', price_prefix_label: 'ابتداءً من', price_secondary_label: 'عرض سعر مخصص، فوترة سنوية', features: ['فرق ومواقع متعددة', 'لوحة معلومات لكل موقع', 'جلسة أولى بإشراف فريقنا', 'فاتورة سنوية عبر تحويل مصرفي'], cta_label: 'اطلب عرضًا تجريبيًا', badge: 'متعدد المواقع' },
    },
  },
]);

export function getPricingPlansFallback() {
  return FALLBACK_PRICING_PLANS.map((plan) => ({ ...plan }));
}
