import { getPublicSiteOrigin } from '@/lib/siteMetadata';
import { TEAM_BUILDING_CONTENT } from '@/lib/teamBuildingContent';
import { PUBLIC_PAGE_COPY, PUBLIC_SEO_PATHS, getPublicSeoLocales } from '@/lib/seo';
import { getLocaleMeta, withLocalePath } from '@/lib/i18n/routing';
import { pickLocalized } from '@/lib/i18n';
import { getChallengeExamples } from '@/lib/landing/landingContent';
import { FALLBACK_PRICING_PLANS } from '@/lib/pricingFallbackPlans';
import { CONTACT_EMAIL } from '@/lib/structuredData';

// Faits clés en anglais, la langue la plus lue par les moteurs de réponse.
// Mêmes sources que les pages publiques : défis de l'accueil et grille tarifaire canonique.
const FACTS_LOCALE = 'en';

function buildKeyFacts(origin) {
  const languages = getPublicSeoLocales().map((locale) => getLocaleMeta(locale).name).join(', ');
  const plans = FALLBACK_PRICING_PLANS.filter((plan) => plan.is_active).map((plan) => {
    const content = pickLocalized(plan.localized_content, FACTS_LOCALE);
    const price = [content.price_prefix_label, content.price_label || content.price_monthly_label].filter(Boolean).join(' ');
    return `- ${content.name}: ${price}${content.price_secondary_label ? ` (${content.price_secondary_label})` : ''}. ${content.description} Includes: ${content.features.join(', ')}.`;
  });
  const challenges = getChallengeExamples(FACTS_LOCALE).map(({ title, duration, description }) => `- ${title} (${duration}): ${description}`);
  return [
    '## Key facts', '',
    '- Category: web-based team building and team cohesion platform (B2B SaaS).',
    '- Audience: managers, HR teams and facilitators of on-site, remote and hybrid teams.',
    '- How it works: the facilitator builds a session from collaborative challenges, runs it live, then reviews a summary to support the team debrief.',
    '- Participants join from a web browser with a link or session code; nothing to install. Remote sessions use a separate video call for voice.',
    '- Challenges last about 15 to 35 minutes each.',
    `- Interface languages: ${languages}.`,
    `- Contact: ${CONTACT_EMAIL} or ${origin}${withLocalePath(FACTS_LOCALE, '/contact')}`, '',
    '## Plans', '', ...plans, `- Details: ${origin}${withLocalePath(FACTS_LOCALE, '/pricing')}`, '',
    '## Challenge examples', '', ...challenges, '',
  ];
}


export const dynamic = 'force-static';

export function GET() {
  const origin = getPublicSiteOrigin();
  const sections = ['# TeamBlender', '', `> ${TEAM_BUILDING_CONTENT.en.intro}`, '',
    'Public product information. Session data, participant identities and private account pages are not public sources.',
    'The Pricing page is the reference for current prices and plan limits. No individual psychometric assessment is claimed.',
    'This discovery file is not an access policy or a guarantee of inclusion in AI answers.', '',
    ...buildKeyFacts(origin)];
  for (const locale of getPublicSeoLocales()) {
    sections.push(`## ${getLocaleMeta(locale).name}`, '');
    for (const path of PUBLIC_SEO_PATHS) {
      const copy = PUBLIC_PAGE_COPY[locale][path];
      if (!copy) continue;
      sections.push(`- [${copy.title}](${origin}${withLocalePath(locale, path)}): ${copy.description}`);
    }
    sections.push('');
  }
  sections.push(`## Discovery`, '', `- [Sitemap](${origin}/sitemap.xml)`, `- [Robots](${origin}/robots.txt)`, '');
  return new Response(sections.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex' },
  });
}
