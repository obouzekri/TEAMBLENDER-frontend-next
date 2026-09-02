"use client";

import GamifiedIcon from './GamifiedIcon';
import TrustProofCard from './TrustProofCard';
import { resolveMetricIcon } from './landingIconResolvers';

export default function LandingSocialProof({ locale, partnersHeader, useCaseChips, trustProofMetrics }) {
  return (
    <section
      className="landing-partners landing-section-full landing-section-full--proof relative overflow-hidden p-8 sm:p-12"
      style={{
        '--reveal-delay': '110ms',
        background: 'linear-gradient(180deg, #07111f 0%, #0b1730 100%)',
      }}
      aria-label={locale === 'en' ? 'Social proof' : 'Preuve sociale'}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_16%,rgba(96,165,250,0.18),transparent_42%)]" />
      <div className="landing-section-inner relative space-y-6">
        <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
          <div>
            {partnersHeader.label ? (
              <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200 ring-1 ring-white/10">
                {partnersHeader.label}
              </p>
            ) : null}
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {partnersHeader.title}
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              {partnersHeader.description}
            </p>
          </div>

          <div className="landing-partners-usage rounded-2xl bg-white/6 p-5 shadow-sm ring-1 ring-white/12 backdrop-blur-sm">
            <p className="landing-partners-title">{locale === 'en' ? 'Teams using TeamBlender' : 'Équipes qui utilisent TeamBlender'}</p>
            <div className="landing-platform-scent landing-usecase-chips" aria-label={locale === 'en' ? 'Use cases' : 'Cas d’usage'}>
              {useCaseChips.map(({ label, Icon }, index) => (
                <span key={`use-case-${index}-${label}`} className="landing-usecase-chip">
                  <GamifiedIcon Icon={Icon} index={index} size="xs" />
                  <span>{label}</span>
                </span>
              ))}
            </div>
            <p className="landing-partners-summary text-sm leading-6 text-slate-300">
              {locale === 'en'
                ? 'One modern platform, one clear rhythm, and one shared team experience.'
                : 'Une plateforme moderne, un rythme clair et une expérience d’équipe partagée.'}
            </p>
          </div>
        </div>

        <div className="landing-metrics-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label={locale === 'en' ? 'Key metrics' : 'Indicateurs clés'}>
          {trustProofMetrics.map((metric, index) => (
            <TrustProofCard
              key={`${metric.value}-${index}`}
              value={metric.value}
              label={metric.label}
              detail={metric.detail}
              Icon={resolveMetricIcon(index)}
              index={index}
            />
          ))}
        </div>

      </div>
    </section>
  );
}
