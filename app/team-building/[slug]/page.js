import { notFound } from 'next/navigation';
import TeamBuildingGuide from '@/components/TeamBuildingGuide';
import { getSeoRequest } from '@/lib/seoRequest';
import { getTeamBuildingGuide } from '@/lib/teamBuildingGuides';

export default async function TeamBuildingUseCasePage({ params }) {
  const { slug } = await params;
  const { locale } = await getSeoRequest();
  const content = getTeamBuildingGuide(slug, locale);
  if (!content) notFound();

  return <TeamBuildingGuide content={content} locale={locale} pathname={`/team-building/${slug}`} />;
}
