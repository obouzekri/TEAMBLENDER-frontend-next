import AdminClient from './AdminClient';

export const metadata = {
  title: 'Admin | TeamBlender',
  description: 'Console admin TeamBlender pour utilisateurs, sessions et challenges.',
  robots: 'noindex, nofollow',
};

export default function AdminPage() {
  return <AdminClient />;
}

