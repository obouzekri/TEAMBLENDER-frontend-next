"use client";

import { Quote } from 'lucide-react';
import GamifiedIcon from './GamifiedIcon';

export default function LandingTestimonials({ locale, testimonialsHeader, testimonialItems }) {
  return (
    <section
      className="landing-testimonials landing-section-full relative overflow-hidden p-6 sm:p-10"
      style={{
        '--reveal-delay': '170ms',
        background: 'linear-gradient(145deg, #f6fbff 0%, #eef6ff 100%)',
      }}
      aria-label={locale === 'en' ? 'Customer testimonials' : 'Témoignages clients'}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(99,102,241,0.10),transparent_44%)]" />
      <div className="landing-section-inner relative">
        <div className="panel-head landing-testimonials-head">
          <div>
            <p className="eyebrow landing-section-eyebrow">{testimonialsHeader.label}</p>
            <h2 className="landing-section-title text-slate-950">{testimonialsHeader.title}</h2>
          </div>
        </div>
        <div className="landing-testimonials-carousel mt-7" role="region" aria-label={locale === 'en' ? 'Testimonials carousel' : 'Carrousel de temoignages'}>
          {testimonialItems.map((item, index) => (
            <article
              key={`${item.title}-${item.subtitle}`}
              className={`landing-testimonial-card landing-testimonial-slide rounded-3xl p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                index === 0
                  ? 'landing-testimonial-card--featured ring-1 ring-indigo-200/45'
                  : index === 1
                    ? 'landing-testimonial-card--accent ring-1 ring-cyan-200/40'
                    : 'ring-1 ring-slate-200/35'
              }`}
            >
              <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-indigo-600 shadow-sm">
                <GamifiedIcon Icon={Quote} index={index} size="xs" />
              </div>
              <div className="landing-testimonial-head">
                <div className="landing-testimonial-avatar" aria-hidden="true">{item.initials}</div>
                <div>
                  <strong className="block text-sm font-semibold text-slate-950">{item.title}</strong>
                  <span className="text-sm text-slate-500">{item.subtitle}</span>
                </div>
              </div>
              <p className="text-base leading-7 text-slate-700">“{item.description}”</p>
            </article>
          ))}
        </div>
        <div className="landing-swipe-dots landing-testimonial-dots" aria-hidden="true">
          {testimonialItems.map((_, index) => (
            <span key={`testimonial-dot-${index}`} className={`landing-swipe-dot${index === 0 ? ' is-active' : ''}`} />
          ))}
        </div>
      </div>
    </section>
  );
}
