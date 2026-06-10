import './globals.css';
import { IBM_Plex_Sans, Sora } from 'next/font/google';
import TrackingConsentGate from '@/components/TrackingConsentGate';

const fontUi = IBM_Plex_Sans({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  variable: '--font-ui-loaded',
  weight: ['400', '500', '600', '700'],
});

const fontDisplay = Sora({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
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

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className={`${fontUi.variable} ${fontDisplay.variable}`}>
        <TrackingConsentGate>{children}</TrackingConsentGate>
      </body>
    </html>
  );
}


