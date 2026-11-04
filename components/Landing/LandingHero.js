"use client";

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Activity, BarChart3, ListChecks, PlayCircle } from 'lucide-react';
import { PILL_CLASS } from './landingStyles';
import { translate, pickLocalized } from '@/lib/i18n';

// Facilitator view of the /demo page while the team assembles CoPuzzle.
// Captures disponibles par langue (repli sur la langue par défaut).
const HERO_CAPTURES = {
  fr: '/images/copuzzle-facilitator-live-fr.webp',
  en: '/images/copuzzle-facilitator-live-en.webp',
};

export function heroCaptureSrc(locale) {
  return pickLocalized(HERO_CAPTURES, locale);
}

export function heroCaptureAlt(locale) {
  return translate(locale, 'landingUi.teamblenderFacilitatorViewTheTeamAssembles');
}

export default function LandingHero({
  locale,
  structuredHeroTitle,
  heroDescription,
  heroEyebrow,
  heroMicrocopy,
  heroPrimaryHref,
  onPrimaryCtaClick,
  heroPrimaryLabel,
  heroDemoHref,
  heroDemoLabel,
  onDemoCtaClick,
  heroImageB,
  fallback,
  onOpenPreview,
}) {
  return (
    <section
      className="landing-hero-full relative overflow-hidden px-0"
      style={{ '--reveal-delay': '40ms' }}
      aria-label={translate(locale, 'landingUi.teamblenderOverview')}
    >
      <div className="landing-hero-aurora pointer-events-none absolute inset-0" />
      <div className="landing-hero-inner relative grid gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <div className="landing-hero-copy max-w-3xl">
          <p className="eyebrow landing-section-eyebrow">{heroEyebrow}</p>
          <h1 className="landing-hero-title max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            <span className="block">{structuredHeroTitle}</span>
          </h1>

          <p className="landing-hero-description mt-5 max-w-2xl text-base leading-7 sm:text-lg">
            {heroDescription}
          </p>

          <div className="landing-hero-actions mt-6 flex flex-wrap gap-3">
            <Link
              href={heroPrimaryHref}
              onClick={onPrimaryCtaClick}
              className={`${PILL_CLASS} landing-cta-primary landing-hero-primary-btn cta-surface group text-white`}
            >
              <span>{heroPrimaryLabel}</span>
              <ArrowRight className="rtl-flip h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
            </Link>
            <Link
              href={heroDemoHref}
              onClick={onDemoCtaClick}
              className={`${PILL_CLASS} landing-cta-secondary landing-hero-secondary-btn gap-2`}
            >
              <PlayCircle className="h-4 w-4" aria-hidden="true" />
              <span>{heroDemoLabel}</span>
            </Link>
          </div>
          <p className="mt-3 text-sm text-slate-300">{heroMicrocopy}</p>
        </div>

        <div className="landing-hero-product-shell relative">
          <div className="landing-hero-product-wrap">
            <div className="landing-hero-product-head">
              <div>
                <p className="landing-hero-product-title">{fallback.liveExperience}</p>
              </div>
              <div className="landing-hero-product-live">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {fallback.liveLabel}
              </div>
            </div>

            <button
              type="button"
              className="landing-hero-product-button"
              aria-label={translate(locale, 'landingUi.openTheLivePreviewInFullscreen')}
              onClick={onOpenPreview}
            >
              <figure className="landing-hero-product-frame landing-hero-product-frame--interactive">
                <Image
                  src={heroCaptureSrc(locale)}
                  alt={heroCaptureAlt(locale)}
                  width={1600}
                  height={1027}
                  priority
                  sizes="(max-width: 1024px) 92vw, 46rem"
                  className="landing-hero-product-image"
                />
              </figure>
            </button>

            <div className="landing-hero-product-signals" aria-label={fallback.liveSignals.label}>
              <span>
                <Activity className="h-4 w-4" />
                {fallback.liveSignals.timer}
              </span>
              <span>
                <ListChecks className="h-4 w-4" />
                {heroImageB.description || fallback.liveSignals.chat}
              </span>
              <span>
                <BarChart3 className="h-4 w-4" />
                {fallback.liveSignals.progress}
              </span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
