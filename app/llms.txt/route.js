import { getPublicSiteOrigin } from '@/lib/siteMetadata';
import { TEAM_BUILDING_CONTENT } from '@/lib/teamBuildingContent';
import { PUBLIC_PAGE_COPY, PUBLIC_SEO_PATHS } from '@/lib/seo';
import { withLocalePath } from '@/lib/i18n/routing';

export const dynamic = 'force-static';

export function GET() {
  const origin = getPublicSiteOrigin();
  const sections = ['# TeamBlender', '', `> ${TEAM_BUILDING_CONTENT.en.intro}`, '',
    'Public product information. Session data, participant identities and private account pages are not public sources.',
    'For current prices and plan limits, consult the Pricing page. No individual psychometric assessment is claimed.',
    'This discovery file is not an access policy or a guarantee of inclusion in AI answers.', ''];
  for (const locale of ['fr', 'en']) {
    sections.push(`## ${locale === 'fr' ? 'Français' : 'English'}`, '');
    for (const path of PUBLIC_SEO_PATHS) {
      const copy = PUBLIC_PAGE_COPY[locale][path];
      sections.push(`- [${copy.title}](${origin}${withLocalePath(locale, path)}): ${copy.description}`);
    }
    sections.push('');
  }
  sections.push(`## Discovery`, '', `- [Sitemap](${origin}/sitemap.xml)`, `- [Robots](${origin}/robots.txt)`, '');
  return new Response(sections.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex' },
  });
}
