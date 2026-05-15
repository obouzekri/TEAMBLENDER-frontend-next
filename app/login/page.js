import LoginForm from './LoginForm';
import TopNav from '@/components/TopNav';

export const metadata = {
  title: 'Connexion | TeamBlender',
};

export default async function LoginPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const requestedSessionId = String(resolvedSearchParams?.sessionId || '').trim();

  return (
    <>
      <TopNav />
      <LoginForm requestedSessionId={requestedSessionId} />
    </>
  );
}

