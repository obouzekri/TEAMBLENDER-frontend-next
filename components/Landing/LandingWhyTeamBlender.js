"use client";

export default function LandingWhyTeamBlender({ section }) {
  const points = Array.isArray(section?.points) ? section.points : [];
  if (points.length === 0) return null;

  return (
    <section
      className="landing-section-full landing-benefits-section relative overflow-hidden p-6 sm:p-10"
      style={{ '--reveal-delay': '190ms' }}
      aria-label={section.title}
    >
      <div className="landing-section-inner relative">
        <div className="panel-head landing-benefits-head">
          <div>
            <p className="eyebrow landing-section-eyebrow">{section.eyebrow}</p>
            <h2 className="landing-section-title">{section.title}</h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{section.description}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {points.map((point, index) => (
            <article key={`${point.title}-${index}`} className="rounded-2xl border border-slate-200 bg-white/80 p-5">
              <h3 className="text-base font-semibold text-slate-900">{point.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{point.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
