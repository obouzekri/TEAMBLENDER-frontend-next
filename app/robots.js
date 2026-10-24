import { getPublicSiteOrigin } from '@/lib/siteMetadata';
import { getRobotsRules } from '@/lib/seo';

export default function robots() {
  const baseUrl = getPublicSiteOrigin();

  return {
    rules: getRobotsRules(),
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
