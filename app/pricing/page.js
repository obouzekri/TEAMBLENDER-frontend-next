import PricingPageClient from './PricingPageClient';

export const revalidate = 3600;

function resolveServerApiOrigin() {
  const explicit = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || process.env.BACKEND_ORIGIN || process.env.NEXT_BACKEND_ORIGIN;
  if (explicit && /^https?:\/\//i.test(explicit)) {
    return explicit.replace(/\/$/, '');
  }
  return 'https://teamblender-backend-qxe5-production.up.railway.app';
}

async function fetchPricingPlans() {
  try {
    const response = await fetch(`${resolveServerApiOrigin()}/api/pricing-plans`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];
    const payload = await response.json().catch(() => []);
    return Array.isArray(payload) ? payload : [];
  } catch {
    return [];
  }
}

export default async function PricingPage() {
  const initialPlans = await fetchPricingPlans();
  return <PricingPageClient initialPlans={initialPlans} />;
}
