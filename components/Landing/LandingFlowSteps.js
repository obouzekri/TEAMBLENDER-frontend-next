"use client";

import GamifiedIcon from './GamifiedIcon';

export default function LandingFlowSteps({ locale, flowHeader, flowStepsWithIcons }) {
  return (
    <section
      className="landing-flow landing-section-full relative overflow-hidden p-6 sm:p-8"
      style={{
        '--reveal-delay': '190ms',
        background: 'linear-gradient(180deg, #0b1223 0%, #111b36 100%)',
      }}
      aria-label={locale === 'en' ? 'Three-step journey' : 'Parcours en 3 étapes'}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(14,165,233,0.10),transparent_40%)]" />
      <div className="landing-section-inner relative">
        <div className="panel-head">
          <div>
            <p className="eyebrow landing-section-eyebrow">{flowHeader.label}</p>
            <h2 className="landing-section-title text-white">{flowHeader.title}</h2>
          </div>
        </div>
        <div className="landing-flow-timeline mt-8" role="list" aria-label={locale === 'en' ? 'How TeamBlender works in three steps' : 'Comment TeamBlender fonctionne en trois etapes'}>
          {flowStepsWithIcons.map((step, index) => (
            <article
              key={`flow-step-${index}`}
              role="listitem"
              className={`landing-flow-card landing-flow-node rounded-3xl p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                index === 0
                  ? 'landing-flow-card--primary bg-white/94 ring-1 ring-indigo-100'
                  : index === 1
                    ? 'landing-flow-card--secondary bg-white/92 ring-1 ring-cyan-100'
                    : 'landing-flow-card--tertiary bg-white/90 ring-1 ring-slate-200/80'
              }`}
            >
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold text-white shadow-lg ${
                index === 0
                  ? 'bg-gradient-to-br from-indigo-500 to-violet-500 shadow-indigo-500/20'
                  : index === 1
                    ? 'bg-gradient-to-br from-cyan-500 to-sky-500 shadow-cyan-500/20'
                    : 'bg-gradient-to-br from-slate-500 to-slate-700 shadow-slate-500/20'
              }`}>{String(index + 1).padStart(2, '0')}</span>
              <div className="landing-flow-card-title mt-4">
                <span className="landing-flow-card-title-icon" aria-hidden="true">
                  <GamifiedIcon Icon={step.Icon} index={index} size="sm" />
                </span>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">{step.title}</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
