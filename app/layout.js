import './globals.css';
import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import TrackingConsentGate from '@/components/TrackingConsentGate';
import { I18nProvider } from '@/lib/i18n/I18nProvider';

const fontUi = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  variable: '--font-ui-loaded',
  weight: ['400', '500', '600', '700'],
});

const fontDisplay = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  variable: '--font-display-loaded',
  weight: ['500', '600', '700', '800'],
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'TeamBlender | Team building B2B pour managers et RH',
    template: '%s | TeamBlender',
  },
  description:
    'Plateforme B2B de team building pour managers et RH: creez, animez et mesurez des sessions collaboratives hybrides.',
  openGraph: {
    title: 'TeamBlender | Team building B2B pour managers et RH',
    description:
      'Plateforme B2B de team building pour managers et RH: creez, animez et mesurez des sessions collaboratives hybrides.',
    type: 'website',
    images: ['/teamblender-nav-logo.png'],
  },
  icons: {
    icon: '/icon.svg'
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const locale = String(cookieStore.get('tb_locale')?.value || 'fr').toLowerCase() === 'en' ? 'en' : 'fr';

  return (
    <html lang={locale}>
      <body className={`${fontUi.variable} ${fontDisplay.variable}`}>
        <I18nProvider>
          <TrackingConsentGate>{children}</TrackingConsentGate>
        </I18nProvider>
      </body>
    </html>
  );
}


