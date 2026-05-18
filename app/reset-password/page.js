import TopNav from '@/components/TopNav';
import ResetPasswordForm from './ResetPasswordForm';

export const metadata = {
  title: 'Réinitialiser le mot de passe | TeamBlender',
};

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
