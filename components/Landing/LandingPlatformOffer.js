"use client";

export default function LandingPlatformOffer({ fallback, platformOfferItems }) {
  return (
    <section
      className="landing-section-full landing-offer-section relative overflow-hidden p-6 sm:p-9"
      style={{ '--reveal-delay': '140ms' }}
      aria-label={fallback.platformOfferTitle}
    >
      <div className="landing-section-rupture landing-section-rupture--accent" />
      <div className="landing-section-inner relative">
        <div className="panel-head landing-offer-head landing-offer-head--center">
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
      </div>
    </section>
  );
}
