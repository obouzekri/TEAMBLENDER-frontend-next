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
      <div className="landing-benefits-orbit">
        <div className="landing-benefits-orbit__connections" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((connection) => (
            <span
              key={connection}
              className={`landing-benefits-orbit__connection landing-benefits-orbit__connection--${connection}`}
            />
          ))}
        </div>
        <div className="landing-benefits-orbit-center" aria-label={locale === 'en' ? 'Core platform value' : 'Valeur centrale'}>
          <div className="landing-benefits-orbit-center__halo" aria-hidden="true" />
          <strong>
            {locale === 'en'
              ? 'Move forward together.'
              : 'Avancez ensemble.'}
          </strong>
        </div>

        {platformBenefitsItems.slice(0, 5).map((item, index) => {
          const Icon = item.icon;
          return (
            <article
              key={item.label}
              className={`landing-benefits-orbit-item landing-benefits-orbit-item--${index + 1}`}
              tabIndex={0}
            >
              <div className="landing-benefits-orbit-item__head">
                <span className="landing-benefits-orbit-icon" aria-hidden="true">
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
