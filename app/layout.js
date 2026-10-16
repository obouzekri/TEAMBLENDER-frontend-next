import './globals.css';
import TrackingConsentGate from '@/components/TrackingConsentGate';
import ExternalNotificationGuard from '@/components/ExternalNotificationGuard';
import ThemeController from '@/components/ThemeController';
import DisplayPreferencesController from '@/components/DisplayPreferencesController';
import { I18nProvider } from '@/lib/i18n/I18nProvider';
import { getPublicSiteOrigin } from '@/lib/siteMetadata';
import { buildPageMetadata } from '@/lib/seo';
import { getSeoRequest } from '@/lib/seoRequest';
import PublicStructuredData from '@/components/PublicStructuredData';

const siteOrigin = getPublicSiteOrigin();
export async function generateMetadata() {
  const { pathname, locale } = await getSeoRequest();
  return {
    metadataBase: new URL(siteOrigin),
    title: { default: 'TeamBlender', template: '%s | TeamBlender' },
    icons: { icon: '/icon.svg' },
    ...buildPageMetadata(pathname, locale),
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default async function RootLayout({ children }) {
  const { pathname, locale } = await getSeoRequest();

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
              } catch (error) {
                console.error('Unable to read theme preference', error);
                document.documentElement.dataset.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                document.documentElement.dataset.themePreference = 'system';
              }
            })();`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <PublicStructuredData pathname={pathname} locale={locale} />
        <script
          dangerouslySetInnerHTML={{
            __html: `document.body.dataset.theme = document.documentElement.dataset.theme || 'light';`,
          }}
        />
        <ThemeController />
        <ExternalNotificationGuard />
        <I18nProvider initialLocale={locale}>
          <DisplayPreferencesController />
          <a className="skip-to-content" href="#main-content">
            {locale === 'en' ? 'Skip to main content' : 'Aller au contenu principal'}
          </a>
          <div id="main-content" className="skip-to-content-target" tabIndex={-1}>
            <TrackingConsentGate>{children}</TrackingConsentGate>
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}
