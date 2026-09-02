"use client";

import GamifiedIcon from './GamifiedIcon';

export default function TrustProofCard({ value, label, detail, Icon, index = 0 }) {
  return (
    <article className="landing-metric-card rounded-2xl bg-white/80 px-5 py-4 shadow-sm shadow-slate-200/60 ring-1 ring-white/80 backdrop-blur-sm">
      <div className="landing-metric-card__head">
        <span className={`landing-metric-card__icon landing-metric-card__icon--${index % 3}`} aria-hidden="true">
          <GamifiedIcon Icon={Icon} index={index} size="sm" />
        </span>
        <p className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{value}</p>
      </div>
      <p className="mt-1 text-sm font-semibold text-slate-800">{label}</p>
      <p className="mt-1 text-xs leading-5 text-slate-600">{detail}</p>
    </article>
  );
}
