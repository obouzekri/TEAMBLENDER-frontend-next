"use client";

import { Briefcase, Users } from 'lucide-react';

export default function LandingAudience({ fallback }) {
  const personas = [
    { key: 'hr', tag: fallback.hrTag, title: fallback.hrTitle, description: fallback.hrDescription, Icon: Briefcase },
    { key: 'manager', tag: fallback.managerTag, title: fallback.managerTitle, description: fallback.managerDescription, Icon: Users },
  ];

  return (
    <section className="landing-section-full landing-audience-section" aria-labelledby="landing-audience-title">
      <div className="landing-section-inner">
        <div className="landing-section-heading landing-audience-head">
          <p className="eyebrow landing-section-eyebrow">{fallback.audienceEyebrow}</p>
          <h2 id="landing-audience-title" className="landing-section-title">{fallback.audienceTitle}</h2>
        </div>
        <div className="landing-audience-grid">
          {personas.map(({ key, tag, title, description, Icon }) => (
            <article key={key} className={`landing-audience-card landing-audience-card--${key}`}>
              <div className="landing-audience-card__head">
                <span className="landing-audience-card__icon" aria-hidden="true">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="landing-audience-card__tag">{tag}</span>
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
