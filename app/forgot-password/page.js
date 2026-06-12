import TopNav from '@/components/TopNav';
import ForgotPasswordForm from './ForgotPasswordForm';
import { cookies } from 'next/headers';

export async function generateMetadata() {
  const cookieStore = await cookies();
  const isEn = String(cookieStore.get('tb_locale')?.value || 'fr').toLowerCase() === 'en';
  return {
    title: isEn ? 'Forgot password | TeamBlender' : 'Mot de passe oublié | TeamBlender',
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
