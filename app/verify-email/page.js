import TopNav from '@/components/TopNav';
import VerifyEmailForm from './VerifyEmailForm';
import { cookies } from 'next/headers';

export async function generateMetadata() {
  const cookieStore = await cookies();
  const isEn = String(cookieStore.get('tb_locale')?.value || 'fr').toLowerCase() === 'en';
  return {
    title: isEn ? 'Verify your email | TeamBlender' : 'Vérifier votre email | TeamBlender',
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
