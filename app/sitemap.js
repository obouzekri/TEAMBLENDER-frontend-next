import { getPublicSiteOrigin } from '@/lib/siteMetadata';
import { SUPPORTED_LOCALES, withLocalePath } from '@/lib/i18n/routing';
import { getLanguageAlternates, isPreviewEnvironment, PUBLIC_SEO_PATHS } from '@/lib/seo';

export default function sitemap() {
  const baseUrl = getPublicSiteOrigin();
  if (isPreviewEnvironment()) return [];

  return PUBLIC_SEO_PATHS.flatMap((path) => SUPPORTED_LOCALES.map((locale) => ({
    url: `${baseUrl}${withLocalePath(locale, path)}`,
    alternates: { languages: getLanguageAlternates(path) },
  })));
}
