"use client";
import { translate } from '@/lib/i18n';

export default function LandingChallengesShowcase({ locale, challengeExamples }) {
  return (
    <section
      id="challenge-examples"
      className="landing-challenges-section landing-section-full relative overflow-hidden p-6 sm:p-10"
      style={{ '--reveal-delay': '150ms' }}
      aria-label={translate(locale, 'landingUi.challengeExamples')}
    >
      <div className="landing-section-rupture landing-section-rupture--accent" />
      <div className="landing-section-inner relative">
        <div className="landing-challenges-head landing-section-heading">
          <div>
            <p className="eyebrow landing-section-eyebrow">{translate(locale, 'landingUi.teamChallenges')}</p>
            <h2 className="landing-section-title text-white">
              {translate(locale, 'landingUi.severalChallengesToBringPeopleTogether')}
            </h2>
          </div>
        </div>

        <div className="landing-challenges-grid" role="list" aria-label={translate(locale, 'landingUi.challengeExamples')}>
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
              <div className="landing-challenge-card__tags" aria-label={translate(locale, 'landingUi.challengeObjectives')}>
                {tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            </article>
          ))}
        </div>
        <p className="landing-challenges-subtitle mt-6">
          {translate(locale, 'landingUi.andManyMoreChallengesToDiscover')}
        </p>
      </div>
    </section>
  );
}
