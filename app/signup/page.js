import TopNav from '@/components/TopNav';
import SignupForm from './SignupForm';
import { cookies } from 'next/headers';

export async function generateMetadata() {
  const cookieStore = await cookies();
  const isEn = String(cookieStore.get('tb_locale')?.value || 'fr').toLowerCase() === 'en';
  return {
    title: isEn ? 'Create account | TeamBlender' : 'Créer un compte | TeamBlender',
  };
}

export default function SignupPage() {
  return (
    <>
      <TopNav compact />
      <SignupForm />
    </>
  );
}

