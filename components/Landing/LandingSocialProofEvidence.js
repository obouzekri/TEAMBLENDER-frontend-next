"use client";

function normalizeItems(items) {
  return Array.isArray(items) ? items.filter(Boolean) : [];
}

export default function LandingSocialProofEvidence({ locale, socialProof }) {
  const logos = normalizeItems(socialProof?.logos);
  const testimonials = normalizeItems(socialProof?.testimonials);

  if (logos.length === 0 && testimonials.length === 0) {
    // TODO: Provide validated logos/testimonials from real customers.
    return null;
  }

  return (
    <div className="mt-6 space-y-4 rounded-2xl bg-white/6 p-5 ring-1 ring-white/12">
      {logos.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
            {locale === 'en' ? 'Trusted by teams such as' : 'Des équipes comme celles-ci nous font confiance'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {logos.map((logo) => (
              <span key={logo.name} className="rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white ring-1 ring-white/15">
                {logo.name}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {testimonials.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-3">
          {testimonials.slice(0, 3).map((testimonial) => (
            <article key={testimonial.quote} className="rounded-xl bg-slate-950/20 p-3 ring-1 ring-white/10">
              <p className="text-sm leading-6 text-slate-200">“{testimonial.quote}”</p>
              <p className="mt-2 text-xs text-slate-300">{testimonial.author}</p>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
