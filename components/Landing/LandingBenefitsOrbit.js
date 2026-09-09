"use client";

import { Sparkles } from 'lucide-react';
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
            <span className="landing-benefits-orbit-center__eyebrow">{locale === 'en' ? 'Core value' : 'Valeur centrale'}</span>
            <div className="landing-benefits-orbit-center__halo" aria-hidden="true" />
            <div className="landing-benefits-orbit-center__badge" aria-hidden="true">
              <Sparkles className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <strong>{locale === 'en' ? 'One platform to create connected, measurable and engaging hybrid team experiences.' : 'Une plateforme pour créer des expériences d’équipe hybrides connectées, mesurables et engageantes.'}</strong>
            <p>{locale === 'en' ? 'Designed for HR teams and managers looking for simplicity, adoption and measurable business impact.' : 'Conçue pour les RH et managers à la recherche de simplicité, d’adoption et d’impact business mesurable.'}</p>
          </div>

          {platformBenefitsItems.slice(0, 5).map((item, index) => {
            const Icon = item.icon;
            return (
              <article
                key={item.label}
                className={`landing-benefits-orbit-item landing-benefits-orbit-item--${index + 1}`}
                tabIndex={0}
              >
                <span className="landing-benefits-orbit-icon" aria-hidden="true">
                  <GamifiedIcon Icon={Icon} index={index} size="sm" />
                </span>
                <h3>{item.label}</h3>
                <p>{item.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
