import { getPublicStructuredData } from '@/lib/structuredData';

export default function PublicStructuredData({ pathname, locale }) {
  const data = getPublicStructuredData(pathname, locale);
  if (!data) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
