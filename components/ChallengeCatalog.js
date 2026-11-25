import Link from 'next/link';
import TopNav from './TopNav';
import Footer from './Footer';
import { withLocalePath } from '@/lib/i18n/routing';
import { translate } from '@/lib/i18n';
import { CHALLENGE_CATALOG_BASE_PATH, getCatalogChallenges } from '@/lib/challengeCatalog';
import guideStyles from '@/app/team-building/page.module.css';
import styles from './ChallengeCatalog.module.css';

function Breadcrumb({ locale, hub, challenge }) {
  return (
    <nav aria-label={translate(locale, 'landingUi.breadcrumb')}>
      <Link href={withLocalePath(locale, '/')}>{translate(locale, 'shell.breadcrumbHome')}</Link>
      {' / '}
      {challenge ? (
        <>
          <Link href={withLocalePath(locale, CHALLENGE_CATALOG_BASE_PATH)}>{hub.breadcrumb}</Link>
          {' / '}
          <span aria-current="page">{challenge.name}</span>
        </>
      ) : <span aria-current="page">{hub.breadcrumb}</span>}
    </nav>
  );
}

function ChallengeCards({ locale, challenges, headingId, title }) {
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId}>{title}</h2>
      <ul className={styles.grid}>
        {challenges.map((challenge) => (
          <li key={challenge.slug}>
            <article className={styles.card}>
              <h3><Link href={withLocalePath(locale, challenge.path)}>{challenge.name}</Link></h3>
              <p>{challenge.subtitle || challenge.objective}</p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Actions({ locale, labels }) {
  return (
    <nav className={guideStyles.actions} aria-label={translate(locale, 'landingUi.nextSteps')}>
      <Link className="btn btn-primary" href={withLocalePath(locale, '/demo')}>{labels.tryDemo}</Link>
      <Link className="btn btn-secondary" href={withLocalePath(locale, '/pricing')}>{labels.seePricing}</Link>
    </nav>
  );
}

export function ChallengeCatalogHub({ hub, locale }) {
  const { labels } = hub;
  return (
    <>
      <TopNav />
      <main className={`shell ${guideStyles.guide}`}>
        <Breadcrumb locale={locale} hub={hub} />
        <article>
          <header>
            <p className="eyebrow">TeamBlender</p>
            <h1>{hub.title}</h1>
            <p>{hub.intro}</p>
          </header>
          <ChallengeCards locale={locale} challenges={getCatalogChallenges(locale)} headingId="all-challenges" title={hub.listTitle} />
          <section>
            <h2>{hub.howToChooseTitle}</h2>
            <p>{hub.howToChoose}</p>
          </section>
          <section>
            <h2>{labels.format}</h2>
            <p>{labels.formatText}</p>
          </section>
          <Actions locale={locale} labels={labels} />
        </article>
      </main>
      <Footer />
    </>
  );
}

export function ChallengeCatalogDetail({ hub, challenge, locale }) {
  const { labels } = hub;
  const players = [
    ['min', labels.playersMin], ['recommended', labels.playersRecommended], ['max', labels.playersMax],
  ].filter(([key]) => challenge.participants[key]);
  const others = getCatalogChallenges(locale).filter(({ slug }) => slug !== challenge.slug);

  return (
    <>
      <TopNav />
      <main className={`shell ${guideStyles.guide}`}>
        <Breadcrumb locale={locale} hub={hub} challenge={challenge} />
        <article>
          <header>
            <p className="eyebrow">{hub.breadcrumb}</p>
            <h1>{challenge.name}</h1>
            <p>{challenge.intro}</p>
          </header>
          <section aria-labelledby="challenge-objective">
            <h2 id="challenge-objective">{labels.objective}</h2>
            <p>{challenge.objective}</p>
            {players.length ? (
              <>
                <h3>{labels.players}</h3>
                <dl className={styles.facts}>
                  {players.map(([key, label]) => (
                    <div key={key}><dt>{label}</dt><dd>{challenge.participants[key]}</dd></div>
                  ))}
                </dl>
              </>
            ) : null}
          </section>
          {challenge.participantRules.length ? (
            <section aria-labelledby="challenge-rules">
              <h2 id="challenge-rules">{labels.howItPlays}</h2>
              <ul>
                {challenge.participantRules.map((rule) => <li key={rule}>{rule}</li>)}
              </ul>
            </section>
          ) : null}
          <section aria-labelledby="challenge-skills">
            <h2 id="challenge-skills">{labels.skills}</h2>
            <ul className={styles.tags}>
              {challenge.skills.map((skill) => <li key={skill}>{skill}</li>)}
            </ul>
          </section>
          <section aria-labelledby="challenge-ideal-for">
            <h2 id="challenge-ideal-for">{labels.idealFor}</h2>
            <ul>
              {challenge.idealFor.map((useCase) => <li key={useCase}>{useCase}</li>)}
            </ul>
          </section>
          <section aria-labelledby="challenge-format">
            <h2 id="challenge-format">{labels.format}</h2>
            <p>{labels.formatText}</p>
          </section>
          <Actions locale={locale} labels={labels} />
          <ChallengeCards locale={locale} challenges={others} headingId="other-challenges" title={labels.otherChallenges} />
        </article>
      </main>
      <Footer />
    </>
  );
}
