import LinkedInAdminClient from './LinkedInAdminClient';

export const metadata = {
  title: 'LinkedIn | Admin | TeamBlender',
  description: 'Créer et gérer les brouillons de publications LinkedIn de TeamBlender.',
  robots: 'noindex, nofollow',
};

export default function LinkedInAdminPage() {
  return <LinkedInAdminClient />;
}
