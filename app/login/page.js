import LoginForm from './LoginForm';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import { cookies } from 'next/headers';

export async function generateMetadata() {
  const cookieStore = await cookies();
  const isEn = String(cookieStore.get('tb_locale')?.value || 'fr').toLowerCase() === 'en';
  return {
    title: isEn ? 'Login | TeamBlender' : 'Connexion | TeamBlender',
  };
}

export default async function LoginPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const requestedSessionId = String(resolvedSearchParams?.sessionId || '').trim();
  const requestedInviteToken = String(resolvedSearchParams?.invite || '').trim();
  const requestedMode = String(resolvedSearchParams?.mode || '').trim().toLowerCase();
  const requestedJoinCode = String(resolvedSearchParams?.code || '').trim();

  return (
    <>
      <TopNav compact />
      <LoginForm
        requestedSessionId={requestedSessionId}
        requestedInviteToken={requestedInviteToken}
        requestedMode={requestedMode}
        requestedJoinCode={requestedJoinCode}
      />
      <Footer />
    </>
  );
}

