import { getPublicSiteOrigin } from '@/lib/siteMetadata';

export default function PublicStructuredData() {
  const origin = getPublicSiteOrigin();
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${origin}/#organization`,
        name: 'TeamBlender',
        url: origin,
        logo: `${origin}/teamblender-nav-logo.png`,
        sameAs: ['https://www.linkedin.com/company/teamblender/'],
      },
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        name: 'TeamBlender',
        url: origin,
        inLanguage: ['fr', 'en'],
        publisher: { '@id': `${origin}/#organization` },
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
