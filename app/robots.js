import { getPublicSiteOrigin } from '@/lib/siteMetadata';
import { getRobotsDisallowPaths, isPreviewEnvironment } from '@/lib/seo';

export default function robots() {
  const baseUrl = getPublicSiteOrigin();

  return {
    rules: {
      userAgent: '*',
      ...(isPreviewEnvironment()
        ? { disallow: '/' }
        : { allow: '/', disallow: getRobotsDisallowPaths() }),
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
