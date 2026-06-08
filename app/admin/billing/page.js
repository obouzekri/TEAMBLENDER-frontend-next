import BillingAdminClient from './BillingAdminClient';

export const metadata = {
  title: 'Admin Billing | TeamBlender',
  description: 'Backoffice abonnements, paiements et factures TeamBlender.',
  robots: 'noindex, nofollow',
};

export default function AdminBillingPage() {
  return <BillingAdminClient />;
}
