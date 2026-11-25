import PricingPageClient from './PricingPageClient';
import { getPricingPlansFallback } from '@/lib/pricingFallbackPlans';
import { getPricingStructuredData } from '@/lib/structuredData';
import { getSeoRequest } from '@/lib/seoRequest';

function resolveServerApiOrigin() {
  const explicit = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || process.env.BACKEND_ORIGIN || process.env.NEXT_BACKEND_ORIGIN;
  if (explicit && /^https?:\/\//i.test(explicit)) {
    return explicit.replace(/\/$/, '');
  }
  return 'https://teamblender-backend-qxe5-production.up.railway.app';
}

async function fetchPricingPlans() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${resolveServerApiOrigin()}/api/pricing-plans`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) return getPricingPlansFallback();
    const payload = await response.json().catch(() => []);
    return Array.isArray(payload) && payload.length > 0 ? payload : getPricingPlansFallback();
  } catch {
    // Backend unreachable/slow: return a stable fallback so pricing remains
    // visible/indexable and the client can refresh in background.
    return getPricingPlansFallback();
  } finally {
    clearTimeout(timeout);
  }
}

export default async function PricingPage() {
  const [initialPlans, { locale }] = await Promise.all([fetchPricingPlans(), getSeoRequest()]);
  const offersData = getPricingStructuredData(initialPlans, locale);
  return (
    <>
      {offersData ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(offersData).replace(/</g, '\\u003c') }} />
      ) : null}
      <PricingPageClient initialPlans={initialPlans} />
    </>
  );
}
