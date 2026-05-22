import './globals.css';

export const metadata = {
  title: 'TeamBlender',
  description: 'TeamBlender frontend migration lot 1',
  icons: {
    icon: '/icon.svg'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

