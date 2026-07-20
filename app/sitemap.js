export default function sitemap() {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const now = new Date();

  const routes = ['/', '/pricing', '/contact', '/login', '/signup', '/cgu', '/mentions-legales', '/politique-confidentialite'];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === '/' || route === '/pricing' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1.0 : route === '/pricing' ? 0.9 : 0.6,
  }));
}
