"use client";

import { GLASS_CARD_CLASS } from './landingStyles';

export default function LandingImpactBand({ locale, impactItems }) {
  if (impactItems.length === 0) return null;

  return (
    <section className="landing-impact-band landing-section-full" style={{ '--reveal-delay': '90ms' }} aria-label={locale === 'en' ? 'Key metrics' : 'Indicateurs cles'}>
      <div className="landing-section-inner grid gap-4 md:grid-cols-3 landing-impact-carousel">
        {impactItems.map((item, index) => (
          <article
            key={`impact-${index}`}
            className={`${GLASS_CARD_CLASS} landing-impact-card p-6 ${index === 0 ? 'landing-impact-card--primary' : index === 1 ? 'landing-impact-card--secondary' : 'landing-impact-card--tertiary'}`}
          >
            <div className="flex items-center gap-3">
              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-lg ${index === 1 ? 'bg-gradient-to-br from-cyan-500 to-sky-500 shadow-cyan-500/20' : index === 2 ? 'bg-gradient-to-br from-slate-700 to-slate-500 shadow-slate-500/20' : 'bg-gradient-to-br from-indigo-500 to-violet-500 shadow-indigo-500/20'}`}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <strong className="block text-2xl font-semibold tracking-tight text-slate-950">{item.value}</strong>
                <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="landing-swipe-dots landing-impact-dots" aria-hidden="true">
        {impactItems.map((_, index) => (
          <span key={`impact-dot-${index}`} className={`landing-swipe-dot${index === 0 ? ' is-active' : ''}`} />
        ))}
      </div>
    </section>
  );
}
