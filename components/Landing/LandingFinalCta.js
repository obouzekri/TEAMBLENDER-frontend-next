"use client";

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PILL_CLASS } from './landingStyles';

export default function LandingFinalCta({ locale, finalCta, fallback, finalPrimaryHref, finalPrimaryLabel }) {
  return (
    <section className="landing-cta-block landing-section-full p-8 text-center" style={{ '--reveal-delay': '240ms' }} aria-label={locale === 'en' ? 'Final call to action' : 'Dernier appel à l’action'}>
      <div className="landing-section-inner">
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{finalCta.title || fallback.finalCtaTitle}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">{finalCta.description || fallback.finalCtaDescription}</p>
        <div className="hero-actions home-hero-actions landing-cta-actions mt-7 flex flex-wrap justify-center gap-3">
          <Link href={finalPrimaryHref} className={`${PILL_CLASS} landing-cta-primary landing-hero-primary-btn cta-surface !text-white`}>
            <span>{finalPrimaryLabel}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
