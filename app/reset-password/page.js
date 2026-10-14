import TopNav from '@/components/TopNav';
import ResetPasswordForm from './ResetPasswordForm';
import { cookies } from 'next/headers';

export async function generateMetadata() {
  const cookieStore = await cookies();
  const isEn = String(cookieStore.get('tb_locale')?.value || 'fr').toLowerCase() === 'en';
  return {
    title: isEn ? 'Reset password' : 'Réinitialiser le mot de passe',
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function ResetPasswordPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const token = String(resolvedSearchParams?.token || '').trim();
  const rawUserType = String(resolvedSearchParams?.userType || '').trim().toLowerCase();
  const userType = rawUserType === 'participant' ? 'participant' : 'user';

  return (
    <>
      <TopNav />
      <ResetPasswordForm token={token} userType={userType} />
    </>
  );
}
