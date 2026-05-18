import TopNav from '@/components/TopNav';
import VerifyEmailForm from './VerifyEmailForm';

export const metadata = {
  title: 'Vérifier votre email | TeamBlender',
};

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
