import { notFound } from 'next/navigation';
import { ChallengeCatalogHub } from '@/components/ChallengeCatalog';
import { getSeoRequest } from '@/lib/seoRequest';
import { getChallengeCatalogHub } from '@/lib/challengeCatalog';

export default async function ChallengeCatalogPage() {
  const { locale } = await getSeoRequest();
  const hub = getChallengeCatalogHub(locale);
  if (!hub) notFound();
  return <ChallengeCatalogHub hub={hub} locale={locale} />;
}
