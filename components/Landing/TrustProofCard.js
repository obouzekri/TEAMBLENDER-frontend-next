"use client";

import GamifiedIcon from './GamifiedIcon';

export default function TrustProofCard({ value, label, detail, Icon, index = 0 }) {
  return (
    <article className="landing-metric-card rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm shadow-slate-200/60 sm:p-5">
      <div className="landing-metric-card__head">
        <span className={`landing-metric-card__icon landing-metric-card__icon--${index % 3}`} aria-hidden="true">
          <GamifiedIcon Icon={Icon} index={index} size="sm" />
        </span>
        <p className="text-lg font-bold tracking-tight text-slate-900">{value}</p>
      </div>
      <p className="landing-metric-card__tagline mt-1.5 text-sm font-semibold">{label}</p>
      <p className="mt-1 text-sm leading-[1.4] text-slate-600">{detail}</p>
    </article>
  );
}
