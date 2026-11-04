import TopNav from '@/components/TopNav';
import VerifyEmailForm from './VerifyEmailForm';
import { cookies } from 'next/headers';
import { translate } from '@/lib/i18n';
import { normalizeLocale } from '@/lib/i18n/routing';
import { LOCALE_COOKIE } from '@/lib/i18n/detectLocale';

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  return {
    title: translate(locale, 'auth.metaTitleVerifyEmail'),
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function VerifyEmailPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const token = String(resolvedSearchParams?.token || '').trim();
  const rawUserType = String(resolvedSearchParams?.userType || '').trim().toLowerCase();
  const userType = rawUserType === 'participant' ? 'participant' : 'user';

  return (
    <>
      <TopNav />
      <VerifyEmailForm token={token} userType={userType} />
    </>
  );
}
