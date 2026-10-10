"use client";

export default function LandingSessionOutcomes({ locale, outcomesSection }) {
  const items = Array.isArray(outcomesSection?.items) ? outcomesSection.items : [];
  if (items.length === 0) return null;

  return (
    <section
      className="landing-section-full landing-offer-section relative overflow-hidden p-6 sm:p-9"
      style={{ '--reveal-delay': '170ms' }}
      aria-label={outcomesSection.title}
    >
      <div className="landing-section-inner relative">
        <div className="panel-head landing-offer-head landing-offer-head--center">
          <div className="landing-offer-head-content">
            <p className="eyebrow landing-section-eyebrow">{outcomesSection.eyebrow}</p>
            <h2 className="landing-section-title">{outcomesSection.title}</h2>
            <p className="landing-offer-subtitle">{outcomesSection.description}</p>
          </div>
        </div>

        <ul className="landing-core-features-grid" aria-label={outcomesSection.title}>
          {items.map((item, index) => (
            <li key={`${item.label}-${index}`} className="landing-core-feature-card">
              <h3 className="landing-core-feature-title">{item.label}</h3>
              <p className="landing-core-feature-description">{item.description}</p>
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/70 p-4 text-sm text-slate-600">
          {locale === 'en'
            ? 'TODO: Add a real screenshot of the session report (participation, challenge progression, and debrief metrics).'
            : 'TODO\u00A0: Ajouter une vraie capture du rapport de session (participation, progression des défis et indicateurs de débrief).'}
        </div>
      </div>
    </section>
  );
}
