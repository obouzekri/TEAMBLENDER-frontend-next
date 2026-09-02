"use client";

export default function LandingChallengesShowcase({ locale, challengeExamples }) {
  return (
    <section
      className="landing-challenges-section landing-section-full relative overflow-hidden p-6 sm:p-10"
      style={{ '--reveal-delay': '150ms' }}
      aria-label={locale === 'en' ? 'Challenge examples' : 'Exemples de défis'}
    >
      <div className="landing-section-rupture landing-section-rupture--accent" />
      <div className="landing-section-inner relative">
        <div className="landing-challenges-head">
          <div>
            <p className="eyebrow landing-section-eyebrow">{locale === 'en' ? 'Challenge library' : 'Bibliothèque de défis'}</p>
            <h2 className="landing-section-title text-white">
              {locale === 'en' ? 'Explore interactive challenge formats' : 'Exemples de défis prêts à l’emploi'}
            </h2>
            <p className="landing-challenges-subtitle">
              {locale === 'en'
                ? 'Short, structured formats designed for every team objective.'
                : 'Des formats courts, structurés et adaptés à tous vos enjeux d’équipe.'}
            </p>
          </div>
        </div>

        <div className="landing-challenges-grid" role="list" aria-label={locale === 'en' ? 'Challenge examples' : 'Exemples de défis'}>
          {challengeExamples.map(({ category, duration, title, description, tags, Icon }) => (
            <article key={title} className="landing-challenge-card" role="listitem">
              <div className="landing-challenge-card__topline">
                <span className="landing-challenge-card__icon" aria-hidden="true">
                  <Icon className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <span className="landing-challenge-card__meta">{category} · {duration}</span>
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
              <div className="landing-challenge-card__tags" aria-label={locale === 'en' ? 'Challenge objectives' : 'Objectifs du challenge'}>
                {tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
