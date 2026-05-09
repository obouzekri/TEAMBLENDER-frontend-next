import TopNav from '@/components/TopNav';
import SignupForm from './SignupForm';

export const metadata = {
  title: 'Creer un compte | TEAMSPARK',
};

export default function SignupPage() {
  return (
    <>
      <TopNav />
      <SignupForm />
    </>
  );
}
