import TopNav from '@/components/TopNav';
import VerifyEmailForm from './VerifyEmailForm';

export const metadata = {
  title: 'Vérifier votre email | TeamBlender',
};

export default async function VerifyEmailPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const token = String(resolvedSearchParams?.token || '').trim();

  return (
    <>
      <TopNav />
      <VerifyEmailForm token={token} />
    </>
  );
}
