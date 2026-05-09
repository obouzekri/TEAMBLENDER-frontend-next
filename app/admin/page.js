import AdminClient from './AdminClient';

export const metadata = {
  title: 'Admin | TEAMSPARK',
  description: 'Console admin TEAMSPARK pour utilisateurs, sessions et challenges.',
  robots: 'noindex, nofollow',
};

export default function AdminPage() {
  return <AdminClient />;
}
