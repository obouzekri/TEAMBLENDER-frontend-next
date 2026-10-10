"use client";

import GamifiedIcon from './GamifiedIcon';

export default function LandingBenefitsOrbit({ locale, fallback, platformBenefitsItems }) {
  return (
    <section
      className="landing-section-full landing-benefits-section relative overflow-hidden p-6 sm:p-10"
      style={{ '--reveal-delay': '160ms' }}
      aria-label={fallback.benefitsTitle}
    >
      <div className="landing-section-rupture landing-section-rupture--dark" />
      <div className="landing-section-inner relative">
        <div className="panel-head landing-benefits-head">
          <div>
            <p className="eyebrow landing-section-eyebrow">{fallback.benefitsEyebrow}</p>
            <h2 className="landing-section-title">{fallback.benefitsTitle}</h2>
          </div>
        </div>
        <div className="landing-benefits-orbit mt-6">
          <div className="landing-benefits-orbit__connections" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((connection) => <span key={connection} className={`landing-benefits-orbit__connection landing-benefits-orbit__connection--${connection}`} />)}
          </div>
          <div className="landing-benefits-orbit-center" aria-label={locale === 'en' ? 'Core platform value' : 'Valeur centrale'}>
            <div className="landing-benefits-orbit-center__halo" aria-hidden="true" />
            <strong>{locale === 'en' ? 'A shared live challenge format for managers, teams, and HR.' : 'Un format de défis en direct partagé entre managers, équipes et RH.'}</strong>
            <p>{locale === 'en' ? 'Your team gets a meaningful collective moment, and you get outcomes ready to use in debrief.' : 'Votre équipe vit un vrai moment collectif, et vous repartez avec des résultats directement utiles au débrief.'}</p>
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
    </section>
  );
}
