import { getPublicSiteOrigin } from '@/lib/siteMetadata';

export default function robots() {
  const baseUrl = getPublicSiteOrigin();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/account',
        '/admin',
        '/challenges',
        '/home',
        '/participant',
        '/preferences',
        '/session-builder',
        '/session-live',
        '/session-results',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
