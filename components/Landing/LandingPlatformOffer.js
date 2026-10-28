"use client";

import LandingBenefitsOrbit from './LandingBenefitsOrbit';

export default function LandingPlatformOffer({ locale, fallback, platformOfferItems, platformBenefitsItems }) {
  if (locale === 'fr') {
    return (
      <section
        className="landing-section-full landing-offer-section landing-platform-section relative overflow-hidden p-6 sm:p-9"
        aria-labelledby="landing-platform-benefits-title"
      >
        <div className="landing-section-rupture landing-section-rupture--accent" />
        <div className="landing-section-inner relative">
          <div className="panel-head landing-offer-head landing-offer-head--center landing-section-heading">
            <p className="eyebrow landing-section-eyebrow">{fallback.benefitsEyebrow}</p>
            <h2 id="landing-platform-benefits-title" className="landing-section-title">
              {fallback.benefitsTitle}
            </h2>
          </div>
          <div className="landing-benefits-grid landing-benefits-grid--open" aria-label={fallback.benefitsTitle}>
            {platformBenefitsItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.label}
                  className={`landing-benefits-grid__item landing-benefits-grid__item--${index + 1}`}
                >
                  <div className="landing-benefits-grid__item-head">
                    <span className="landing-benefits-grid__icon" aria-hidden="true">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3>{item.label}</h3>
                  </div>
                  <p>{item.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="landing-section-full landing-offer-section landing-platform-section relative overflow-hidden p-6 sm:p-9"
      style={{ '--reveal-delay': '140ms' }}
      aria-label={fallback.platformOfferTitle}
    >
      <div className="landing-section-rupture landing-section-rupture--accent" />
      <div className="landing-section-inner relative">
        <div className="panel-head landing-offer-head landing-offer-head--center landing-section-heading">
          <div className="landing-offer-head-content">
            <p className="eyebrow landing-section-eyebrow">{fallback.platformEyebrow}</p>
            <h2 className="landing-section-title">{fallback.platformOfferTitle}</h2>
            <p className="landing-offer-subtitle">{fallback.platformOfferSubtitle}</p>
          </div>
        </div>
        <ul className="landing-core-features-grid" aria-label={fallback.platformOfferTitle}>
          {platformOfferItems.map((item, index) => {
            const Icon = item.icon;
            const featureTitleId = `platform-feature-title-${index}`;
            return (
              <li
                key={item.label}
                className="landing-core-feature-card"
                style={{ '--feature-index': index + 1 }}
              >
                <span className={`landing-core-feature-icon landing-core-feature-icon--${item.tone || 'blue'}`} aria-hidden="true">
                  <Icon className="h-6 w-6" strokeWidth={2.2} />
                </span>
                <h3 id={featureTitleId} className="landing-core-feature-title">{item.label}</h3>
                <p className="landing-core-feature-description">{item.description}</p>
              </li>
            );
          })}
        </ul>
        <LandingBenefitsOrbit
          locale={locale}
          fallback={fallback}
          platformBenefitsItems={platformBenefitsItems}
        />
      </div>
    </section>
  );
}
