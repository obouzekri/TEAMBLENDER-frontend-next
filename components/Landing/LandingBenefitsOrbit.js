"use client";

import GamifiedIcon from './GamifiedIcon';

export default function LandingBenefitsOrbit({ locale, fallback, platformBenefitsItems }) {
  return (
    <div className="landing-platform-benefits" aria-labelledby="landing-benefits-title">
      <div className="panel-head landing-benefits-head landing-section-heading">
        <div>
          <p className="eyebrow landing-section-eyebrow">{fallback.benefitsEyebrow}</p>
          <h3 id="landing-benefits-title" className="landing-section-title">
            {fallback.benefitsTitle}
          </h3>
        </div>
      </div>
      <div className="landing-benefits-grid">
        <div className="landing-benefits-grid__intro" aria-labelledby="landing-benefits-core-title">
          <span className="landing-benefits-grid__eyebrow">
            {locale === 'en' ? 'A simple promise' : 'Une promesse simple'}
          </span>
          <strong id="landing-benefits-core-title">
            {locale === 'en'
              ? 'Team building that moves your team forward.'
              : 'Des moments qui font avancer vos équipes.'}
          </strong>
          <p>
            {locale === 'en'
              ? 'Engaging experiences, easy to run and useful every day.'
              : 'Des expériences fédératrices, simples à lancer et utiles au quotidien.'}
          </p>
        </div>

        {platformBenefitsItems.slice(0, 5).map((item, index) => {
          const Icon = item.icon;
          return (
            <article
              key={item.label}
              className={`landing-benefits-grid__item landing-benefits-grid__item--${index + 1}`}
            >
              <div className="landing-benefits-grid__item-head">
                <span className="landing-benefits-grid__icon" aria-hidden="true">
                  <GamifiedIcon Icon={Icon} index={index} size="sm" />
                </span>
                <h3>{item.label}</h3>
              </div>
              <p>{item.description}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
