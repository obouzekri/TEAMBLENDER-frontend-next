import TopNav from '@/components/TopNav';
import ForgotPasswordForm from './ForgotPasswordForm';

export const metadata = {
  title: 'Mot de passe oublié | TeamBlender',
};

export default function ForgotPasswordPage() {
  return (
    <>
      <TopNav />
      <ForgotPasswordForm />
    </>
  );
}
