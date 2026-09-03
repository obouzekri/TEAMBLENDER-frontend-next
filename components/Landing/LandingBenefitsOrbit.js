"use client";

import { Sparkles } from 'lucide-react';
import GamifiedIcon from './GamifiedIcon';

export default function LandingBenefitsOrbit({ locale, fallback, platformBenefitsItems }) {
  const metricByIndex = [
    locale === 'en' ? 'For hybrid teams' : 'Pour les équipes hybrides',
    locale === 'en' ? 'For everyday collaboration' : 'Pour la collaboration au quotidien',
    locale === 'en' ? 'For managers and HR' : 'Pour les managers et les RH',
    locale === 'en' ? 'For onboarding journeys' : 'Pour les parcours d’onboarding',
    locale === 'en' ? 'For a consistent experience' : 'Pour une expérience cohérente',
  ];

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
          <div className="landing-benefits-orbit-center" aria-label={locale === 'en' ? 'Core platform value' : 'Valeur centrale'}>
            <span className="landing-benefits-orbit-center__eyebrow">{locale === 'en' ? 'Core value' : 'Valeur centrale'}</span>
            <div className="landing-benefits-orbit-center__halo" aria-hidden="true" />
            <div className="landing-benefits-orbit-center__badge" aria-hidden="true">
              <Sparkles className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <strong>{locale === 'en' ? 'One platform to run hybrid team experiences that feel clear, connected, and measurable.' : 'Une seule plateforme pour orchestrer des expériences d’équipe hybrides, claires, connectées et mesurables.'}</strong>
            <p>{locale === 'en' ? 'Designed for managers and HR teams who need a simple system with real business impact.' : 'Pensée pour les managers et RH qui veulent un système simple avec un vrai impact business.'}</p>
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
                <strong className="landing-benefits-orbit-metric">{metricByIndex[index]}</strong>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
