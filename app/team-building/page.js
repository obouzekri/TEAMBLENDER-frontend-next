import TeamBuildingGuide from '@/components/TeamBuildingGuide';
import { getSeoRequest } from '@/lib/seoRequest';
import { TEAM_BUILDING_CONTENT } from '@/lib/teamBuildingContent';

export default async function TeamBuildingPage() {
  const { locale } = await getSeoRequest();
  return <TeamBuildingGuide content={TEAM_BUILDING_CONTENT[locale]} locale={locale} pathname="/team-building" />;
}
