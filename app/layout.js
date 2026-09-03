import './globals.css';
import { cookies } from 'next/headers';
import TrackingConsentGate from '@/components/TrackingConsentGate';
import ExternalNotificationGuard from '@/components/ExternalNotificationGuard';
import ThemeController from '@/components/ThemeController';
import { I18nProvider } from '@/lib/i18n/I18nProvider';

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
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
              try {
                const storedTheme = localStorage.getItem('tb_theme');
                const preference = ['light', 'dark', 'system'].includes(storedTheme) ? storedTheme : 'system';
                const resolvedTheme = preference === 'system'
                  ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                  : preference;
                document.documentElement.dataset.theme = resolvedTheme;
                document.documentElement.dataset.themePreference = preference;
              } catch {
                document.documentElement.dataset.theme = 'light';
                document.documentElement.dataset.themePreference = 'system';
              }
            })();`,
          }}
        />
      </head>
      <body>
        <ThemeController />
        <ExternalNotificationGuard />
        <I18nProvider>
          <TrackingConsentGate>{children}</TrackingConsentGate>
        </I18nProvider>
      </body>
    </html>
  );
}


