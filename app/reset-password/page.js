import TopNav from '@/components/TopNav';
import ResetPasswordForm from './ResetPasswordForm';
import { cookies } from 'next/headers';

export async function generateMetadata() {
  const cookieStore = await cookies();
  const isEn = String(cookieStore.get('tb_locale')?.value || 'fr').toLowerCase() === 'en';
  return {
    title: isEn ? 'Reset password | TeamBlender' : 'Réinitialiser le mot de passe | TeamBlender',
  };
}

export default async function ResetPasswordPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const token = String(resolvedSearchParams?.token || '').trim();

  return (
    <>
      <TopNav />
      <ResetPasswordForm token={token} />
    </>
  );
}
