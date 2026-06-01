import './globals.css';
import { IBM_Plex_Sans, Sora } from 'next/font/google';

const fontUi = IBM_Plex_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-ui-loaded',
  weight: ['400', '500', '600', '700'],
});

const fontDisplay = Sora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display-loaded',
  weight: ['500', '600', '700', '800'],
});

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
      <body className={`${fontUi.variable} ${fontDisplay.variable}`}>{children}</body>
    </html>
  );
}

