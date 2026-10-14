import TopNav from '@/components/TopNav';
import SignupForm from './SignupForm';
import Footer from '@/components/Footer';
import { cookies } from 'next/headers';

export async function generateMetadata() {
  const cookieStore = await cookies();
  const isEn = String(cookieStore.get('tb_locale')?.value || 'fr').toLowerCase() === 'en';
  return {
    title: isEn ? 'Create account' : 'Créer un compte',
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default function SignupPage() {
  return (
    <>
      <TopNav />
      <SignupForm />
      <Footer />
    </>
  );
}
