import Link from 'next/link';
import TopNav from './TopNav';
import Footer from './Footer';
import { getLanguageAlternates } from '@/lib/seo';
import { withLocalePath } from '@/lib/i18n/routing';
import { TEAM_BUILDING_GUIDES } from '@/lib/teamBuildingGuides';
import styles from '@/app/team-building/page.module.css';

export default function TeamBuildingGuide({ content, locale, pathname }) {
  const url = getLanguageAlternates(pathname)[locale];
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    inLanguage: locale,
    isPartOf: { '@id': `${url}#webpage` },
    mainEntity: content.faq.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
  const relatedGuides = [
    { path: '/team-building', title: content.guide },
    ...TEAM_BUILDING_GUIDES.map((guide) => ({
      path: `/team-building/${guide.slug}`, title: guide[locale].title,
    })),
  ].filter(({ path }) => path !== pathname);

  return (
    <>
      <TopNav />
      <main className={`shell ${styles.guide}`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
        <nav aria-label={locale === 'en' ? 'Breadcrumb' : 'Fil d’Ariane'}>
          <Link href={withLocalePath(locale, '/')}>{content.home}</Link>
          {' / '}
          {pathname !== '/team-building' && (
            <><Link href={withLocalePath(locale, '/team-building')}>{content.guide}</Link>{' / '}</>
          )}
          <span aria-current="page">{pathname === '/team-building' ? content.guide : content.title}</span>
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
          <section aria-labelledby="related-guides">
            <h2 id="related-guides">{locale === 'en' ? 'Explore more team building guides' : 'Pour approfondir votre team building'}</h2>
            <ul>
              {relatedGuides.map(({ path, title }) => (
                <li key={path}><Link href={withLocalePath(locale, path)}>{title}</Link></li>
              ))}
            </ul>
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
