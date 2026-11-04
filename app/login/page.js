import LoginForm from './LoginForm';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import { cookies } from 'next/headers';
import { translate } from '@/lib/i18n';
import { normalizeLocale } from '@/lib/i18n/routing';
import { LOCALE_COOKIE } from '@/lib/i18n/detectLocale';

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  return {
    title: translate(locale, 'auth.metaTitleLogin'),
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function LoginPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const requestedSessionId = String(resolvedSearchParams?.sessionId || '').trim();
  const requestedInviteToken = String(resolvedSearchParams?.invite || '').trim();
  const requestedMode = String(resolvedSearchParams?.mode || '').trim().toLowerCase();
  const requestedJoinCode = String(resolvedSearchParams?.code || '').trim();

  return (
    <>
      <TopNav />
      <LoginForm
        requestedSessionId={requestedSessionId}
        requestedInviteToken={requestedInviteToken}
        requestedMode={requestedMode}
        requestedJoinCode={requestedJoinCode}
      />
      <Footer />
    </>
  );
}
