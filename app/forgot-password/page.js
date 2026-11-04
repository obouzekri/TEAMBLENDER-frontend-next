import TopNav from '@/components/TopNav';
import ForgotPasswordForm from './ForgotPasswordForm';
import { cookies } from 'next/headers';
import { translate } from '@/lib/i18n';
import { normalizeLocale } from '@/lib/i18n/routing';
import { LOCALE_COOKIE } from '@/lib/i18n/detectLocale';

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  return {
    title: translate(locale, 'auth.metaTitleForgotPassword'),
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default function ForgotPasswordPage() {
  return (
    <>
      <TopNav />
      <ForgotPasswordForm />
    </>
  );
}
