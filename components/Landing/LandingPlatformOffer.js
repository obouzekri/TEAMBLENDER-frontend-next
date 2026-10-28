"use client";

export default function LandingPlatformOffer({ fallback, platformBenefitsItems }) {
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
