import { getPublicSiteOrigin } from '@/lib/siteMetadata';

export default function sitemap() {
  const baseUrl = getPublicSiteOrigin();
  const now = new Date();

  const routes = ['/', '/pricing', '/contact', '/login', '/signup', '/cgu', '/mentions-legales', '/politique-confidentialite'];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === '/' || route === '/pricing' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1.0 : route === '/pricing' ? 0.9 : 0.6,
  }));
}
