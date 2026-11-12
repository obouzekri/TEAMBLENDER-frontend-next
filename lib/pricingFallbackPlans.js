// Keep in sync with backend/src/config/canonical-pricing-plans.js; test-pricing-display.mjs checks the contract.
// Grille (2026-11-12) : Essai, Essentiel, Organisation. `plan_code` reste trial / team / enterprise.
// Pour l'essai, `max_sessions_per_month` est un total sur la durée de l'essai.
export const FALLBACK_PRICING_PLANS = Object.freeze([
  {
    id: 'trial', plan_code: 'trial', slug: 'teamblender-trial', name: 'Essai', description: 'Pour tester avec une première équipe.',
    features: ['all_challenges'], price_cents: 0, annual_price_cents: 0, currency: 'EUR', billing_cycle: 'monthly',
    cta_label: 'Commencer l’essai', is_active: true, is_fallback: true, highlighted: false, max_users: 20, max_sessions_per_month: 5,
    trial_days: 30, display_order: 1, annual_discount_percentage: 0,
    localized_content: {
      fr: { name: 'Essai', description: 'Pour tester avec une première équipe.', price_label: '0 €', price_secondary_label: 'pendant 30 jours', features: ['Tous les défis', 'Jusqu’à 20 participants', '5 sessions au total', 'Synthèse à la fin de chaque session', '1 compte manager ou RH', 'Sans carte bancaire'], cta_label: 'Commencer l’essai' },
      en: { name: 'Trial', description: 'To try it out with a first team.', price_label: '€0', price_secondary_label: 'for 30 days', features: ['All challenges', 'Up to 20 participants', '5 sessions in total', 'Summary at the end of each session', '1 manager or HR account', 'No credit card'], cta_label: 'Start trial' },
      ar: { name: 'تجربة', description: 'لتجربة المنصة مع فريق أول.', price_label: '0 يورو', price_secondary_label: 'لمدة 30 يومًا', features: ['جميع التحديات', 'حتى 20 مشاركًا', '5 جلسات إجمالًا', 'ملخص في نهاية كل جلسة', 'حساب واحد لمدير أو مسؤول موارد بشرية', 'من دون بطاقة مصرفية'], cta_label: 'ابدأ التجربة' },
    },
  },
  {
    id: 'team', plan_code: 'team', slug: 'teamblender-team', name: 'Essentiel', description: 'Pour un manager ou un RH qui anime ses équipes.',
    features: ['all_challenges'], price_cents: 3900, annual_price_cents: 34800, currency: 'EUR', billing_cycle: 'monthly',
    cta_label: 'Demander l’activation', is_active: true, is_fallback: true, highlighted: true, max_users: 40, max_sessions_per_month: null,
    trial_days: null, display_order: 2, annual_discount_percentage: 25,
    localized_content: {
      fr: { name: 'Essentiel', description: 'Pour un manager ou un RH qui anime ses équipes.', price_monthly_label: '39 €/mois', price_annual_label: '29 €/mois', price_secondary_label: 'facturé 348 €/an, ou 39 € au mois', features: ['Tous les défis', 'Jusqu’à 40 participants', 'Sessions illimitées', 'Synthèse à la fin de chaque session', '1 compte manager ou RH'], cta_label: 'Demander l’activation', badge: 'Recommandé' },
      en: { name: 'Essential', description: 'For a manager or HR lead running their teams.', price_monthly_label: '€39/month', price_annual_label: '€29/month', price_secondary_label: 'billed €348/year, or €39 month-to-month', features: ['All challenges', 'Up to 40 participants', 'Unlimited sessions', 'Summary at the end of each session', '1 manager or HR account'], cta_label: 'Request activation', badge: 'Recommended' },
      ar: { name: 'الأساسية', description: 'لمدير أو مسؤول موارد بشرية ينشّط فرقه.', price_monthly_label: '39 يورو شهريًا', price_annual_label: '29 يورو شهريًا', price_secondary_label: 'تُدفع 348 يورو سنويًا، أو 39 يورو شهريًا', features: ['جميع التحديات', 'حتى 40 مشاركًا', 'جلسات غير محدودة', 'ملخص في نهاية كل جلسة', 'حساب واحد لمدير أو مسؤول موارد بشرية'], cta_label: 'اطلب التفعيل', badge: 'موصى به' },
    },
  },
  {
    id: 'enterprise', plan_code: 'enterprise', slug: 'teamblender-enterprise', name: 'Organisation', description: 'Pour plusieurs managers et RH d’une même organisation.',
    features: ['all_challenges'], price_cents: 180000, annual_price_cents: null, currency: 'EUR', billing_cycle: 'custom',
    cta_label: 'Demander une démo', is_active: true, is_fallback: true, highlighted: false, max_users: 100, max_sessions_per_month: null,
    trial_days: null, display_order: 3, annual_discount_percentage: 0,
    localized_content: {
      fr: { name: 'Organisation', description: 'Pour plusieurs managers et RH d’une même organisation.', price_label: '1 800 €/an', price_prefix_label: 'À partir de', price_secondary_label: 'sur devis, facturation annuelle par virement', features: ['Tous les défis', 'Nombre de participants sur mesure', 'Sessions illimitées', 'Synthèse à la fin de chaque session', 'Jusqu’à 10 comptes manager et RH', 'Assistance prioritaire'], cta_label: 'Demander une démo', badge: 'Multi-comptes' },
      en: { name: 'Organisation', description: 'For several managers and HR leads in one organisation.', price_label: '€1,800/year', price_prefix_label: 'From', price_secondary_label: 'custom quote, billed annually by bank transfer', features: ['All challenges', 'Custom participant limit', 'Unlimited sessions', 'Summary at the end of each session', 'Up to 10 manager and HR accounts', 'Priority support'], cta_label: 'Request a demo', badge: 'Multi-account' },
      ar: { name: 'المؤسسة', description: 'لعدة مديرين ومسؤولي موارد بشرية في المؤسسة نفسها.', price_label: '1,800 يورو سنويًا', price_prefix_label: 'ابتداءً من', price_secondary_label: 'عرض سعر مخصص، فوترة سنوية عبر تحويل مصرفي', features: ['جميع التحديات', 'عدد مشاركين حسب الحاجة', 'جلسات غير محدودة', 'ملخص في نهاية كل جلسة', 'حتى 10 حسابات للمديرين والموارد البشرية', 'دعم ذو أولوية'], cta_label: 'اطلب عرضًا تجريبيًا', badge: 'حسابات متعددة' },
    },
  },
]);

export function getPricingPlansFallback() {
  return FALLBACK_PRICING_PLANS.map((plan) => ({ ...plan }));
}
