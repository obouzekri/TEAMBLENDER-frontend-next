import { notFound } from 'next/navigation';
import { ChallengeCatalogDetail } from '@/components/ChallengeCatalog';
import { getSeoRequest } from '@/lib/seoRequest';
import { getCatalogChallenge, getChallengeCatalogHub } from '@/lib/challengeCatalog';

export default async function CatalogChallengePage({ params }) {
  const { slug } = await params;
  const { locale } = await getSeoRequest();
  const hub = getChallengeCatalogHub(locale);
  const challenge = getCatalogChallenge(slug, locale);
  if (!hub || !challenge) notFound();
  return <ChallengeCatalogDetail hub={hub} challenge={challenge} locale={locale} />;
}
