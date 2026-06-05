import './globals.css';
import { IBM_Plex_Sans, Sora } from 'next/font/google';
import Script from 'next/script';
import PostHogProvider from '@/components/PostHogProvider';
import GoogleAnalyticsProvider from '@/components/GoogleAnalyticsProvider';
import { Analytics } from '@vercel/analytics/next';

const GTM_CONTAINER_ID = String(process.env.NEXT_PUBLIC_GTM_ID || '').trim();
const SHOULD_LOAD_GTM = Boolean(GTM_CONTAINER_ID);

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

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        {SHOULD_LOAD_GTM ? (
          <Script id="gtm-head" strategy="beforeInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
              window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
            `}
          </Script>
        ) : null}
        {SHOULD_LOAD_GTM ? (
          <Script id="gtm-loader" strategy="beforeInteractive">
            {`
              (function(w,d,s,l,i){w[l]=w[l]||[];var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');
            `}
          </Script>
        ) : null}
      </head>
      <body className={`${fontUi.variable} ${fontDisplay.variable}`}>
        {SHOULD_LOAD_GTM ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
              title="gtm"
            />
          </noscript>
        ) : null}
        <GoogleAnalyticsProvider />
        <PostHogProvider />
        {children}
        <Analytics />
      </body>
    </html>
  );
}


