import Link from 'next/link';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import { getSeoRequest } from '@/lib/seoRequest';
import { getLanguageAlternates } from '@/lib/seo';
import { getPublicSiteOrigin } from '@/lib/siteMetadata';
import { withLocalePath } from '@/lib/i18n/routing';
import { TEAM_BUILDING_CONTENT } from '@/lib/teamBuildingContent';
import styles from './page.module.css';

export default async function TeamBuildingPage() {
  const { locale } = await getSeoRequest();
  const content = TEAM_BUILDING_CONTENT[locale];
  const origin = getPublicSiteOrigin();
  const url = getLanguageAlternates('/team-building')[locale];
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        url,
        name: content.title,
        inLanguage: locale,
        isPartOf: { '@id': `${origin}/#website` },
        about: { '@id': `${origin}/#software` },
        mainEntity: content.faq.map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${origin}/#software`,
        name: 'TeamBlender',
        url: origin,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description: content.intro,
        publisher: { '@id': `${origin}/#organization` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: content.home, item: `${origin}${withLocalePath(locale, '/')}` },
          { '@type': 'ListItem', position: 2, name: content.guide, item: url },
        ],
      },
    ],
  };

  return (
    <>
      <TopNav />
      <main className={`shell ${styles.guide}`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
        <nav aria-label={locale === 'en' ? 'Breadcrumb' : 'Fil d’Ariane'}>
          <Link href={withLocalePath(locale, '/')}>{content.home}</Link>
          {' / '}<span aria-current="page">{content.guide}</span>
        </nav>
        <article>
          <header>
            <p className="eyebrow">TeamBlender</p>
            <h1>{content.title}</h1>
            <p>{content.intro}</p>
          </header>
          <section>
            <h2>{content.formatsTitle}</h2>
            <p>{content.formats}</p>
          </section>
          <section>
            <h2>{content.stepsTitle}</h2>
            <ol>
              {content.steps.map(({ title, text }) => (
                <li key={title}><h3>{title}</h3><p>{text}</p></li>
              ))}
            </ol>
          </section>
          <section>
            <h2>{content.examplesTitle}</h2>
            <p>{content.examples}</p>
          </section>
          <section aria-labelledby="team-building-faq">
            <h2 id="team-building-faq">{content.faqTitle}</h2>
            {content.faq.map(({ question, answer }) => (
              <details key={question} className={styles.question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </section>
          <nav className={styles.actions} aria-label={locale === 'en' ? 'Next steps' : 'Pour aller plus loin'}>
            <Link className="btn btn-primary" href={withLocalePath(locale, '/pricing')}>{content.pricing}</Link>
            <Link className="btn btn-secondary" href={withLocalePath(locale, '/contact')}>{content.contact}</Link>
          </nav>
        </article>
      </main>
      <Footer />
    </>
  );
}
