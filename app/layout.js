import './globals.css';

export const metadata = {
  title: 'TEAMSPARK',
  description: 'TEAMSPARK frontend migration lot 1',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
