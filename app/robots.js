import { getPublicSiteOrigin } from '@/lib/siteMetadata';

export default function robots() {
  const baseUrl = getPublicSiteOrigin();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
