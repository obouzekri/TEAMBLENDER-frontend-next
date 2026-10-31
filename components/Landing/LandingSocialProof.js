"use client";

import LandingProofSessionPreview from './LandingProofSessionPreview';
import LandingSocialProofEvidence from './LandingSocialProofEvidence';

const PROOF_TONES = ['indigo', 'cyan', 'teal', 'slate'];

function resolveProofTone(index = 0) {
  return PROOF_TONES[index % PROOF_TONES.length];
}

export default function LandingSocialProof({ locale, partnersHeader, useCaseChips, trustProofMetrics, sessionPreview, socialProof }) {
  return (
    <section
      className="landing-partners landing-proof-section landing-section-full landing-section-full--proof relative overflow-hidden p-8 sm:p-12"
      style={{ '--reveal-delay': '110ms' }}
      aria-label={locale === 'en' ? 'Social proof' : 'Preuve sociale'}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_16%,rgba(96,165,250,0.10),transparent_42%)]" />
      <div className="landing-section-inner relative">
        <div className="landing-proof-layout">
          <div className="landing-proof-copy">
            <div className="landing-section-heading">
              {partnersHeader.label ? (
                <p className="eyebrow landing-section-eyebrow inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200 ring-1 ring-white/10">
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

            <div className="landing-proof-usecases">
              <p className="landing-proof-usecases__label">{locale === 'en' ? 'Great for' : 'Idéal pour'}</p>
              <ul aria-label={locale === 'en' ? 'Use cases' : 'Cas d’usage'}>
                {useCaseChips.map(({ label, Icon }, index) => (
                  <li key={`use-case-${index}-${label}`} className={`landing-proof-usecase landing-proof-tone--${resolveProofTone(index)}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <LandingProofSessionPreview locale={locale} preview={sessionPreview} />
        </div>

        <ul className="landing-proof-points" aria-label={locale === 'en' ? 'Key metrics' : 'Repères clés'}>
          {trustProofMetrics.map(({ icon: Icon, value, detail }, index) => (
            <li key={`${value}-${index}`} className="landing-proof-point">
              <span className={`landing-proof-point__icon landing-proof-tone--${resolveProofTone(index)}`} aria-hidden="true">
                <Icon className="h-5 w-5" />
              </span>
              <h3>{value}</h3>
              <p>{detail}</p>
            </li>
          ))}
        </ul>

        <LandingSocialProofEvidence locale={locale} socialProof={socialProof} />

      </div>
    </section>
  );
}
