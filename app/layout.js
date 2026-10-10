import './globals.css';
import { cookies } from 'next/headers';
import TrackingConsentGate from '@/components/TrackingConsentGate';
import ExternalNotificationGuard from '@/components/ExternalNotificationGuard';
import ThemeController from '@/components/ThemeController';
import DisplayPreferencesController from '@/components/DisplayPreferencesController';
import { I18nProvider } from '@/lib/i18n/I18nProvider';
import { getPublicSiteOrigin, getSocialPreviewImage } from '@/lib/siteMetadata';

const siteOrigin = getPublicSiteOrigin();
const socialPreviewImage = getSocialPreviewImage();

export const metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: 'TeamBlender | Défis d’équipe pour managers et RH',
    template: '%s | TeamBlender',
  },
  description:
    'Rapprochez vos équipes autour de défis à vivre en direct, sur site ou à distance, et repartez avec des résultats concrets pour le débrief.',
  openGraph: {
    title: 'TeamBlender | Défis d’équipe pour managers et RH',
    description:
      'Rapprochez vos équipes autour de défis à vivre en direct, sur site ou à distance, et repartez avec des résultats concrets pour le débrief.',
    type: 'website',
    url: siteOrigin,
    images: [socialPreviewImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TeamBlender | Défis d’équipe pour managers et RH',
    description:
      'Rapprochez vos équipes autour de défis à vivre en direct, sur site ou à distance, et repartez avec des résultats concrets pour le débrief.',
    images: [socialPreviewImage.url],
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
          <DisplayPreferencesController />
          <TrackingConsentGate>{children}</TrackingConsentGate>
        </I18nProvider>
      </body>
    </html>
  );
}
