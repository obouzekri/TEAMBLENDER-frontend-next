"use client";

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Activity, BarChart3, Users } from 'lucide-react';
import { CHIP_CLASS, PILL_CLASS } from './landingStyles';

export default function LandingHero({
  locale,
  structuredHeroTitle,
  heroDescription,
  heroEyebrow,
  heroMicrocopy,
  heroPrimaryHref,
  onPrimaryCtaClick,
  heroPrimaryLabel,
  heroSecondaryHref,
  heroSecondaryLabel,
  heroImageB,
  fallback,
  onOpenPreview,
}) {
  return (
    <section
      className="landing-hero-full relative overflow-hidden px-0 py-4 sm:py-5 lg:py-6"
      style={{ '--reveal-delay': '40ms' }}
      aria-label={locale === 'en' ? 'TeamBlender overview' : 'Presentation TeamBlender'}
    >
      <div className="landing-hero-aurora pointer-events-none absolute inset-0" />
      <div className="landing-hero-inner relative grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
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
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={heroSecondaryHref}
              className={`${CHIP_CLASS} landing-hero-secondary-btn group`}
            >
              <span>{heroSecondaryLabel}</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
          <p className="mt-3 text-sm text-slate-300">{heroMicrocopy}</p>
        </div>

        <div className="landing-hero-product-shell relative lg:translate-x-8 xl:translate-x-14">
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
              aria-label={locale === 'en' ? 'Open the live preview in fullscreen' : 'Ouvrir l’aperçu en plein écran'}
              onClick={onOpenPreview}
            >
              <figure className="landing-hero-product-frame landing-hero-product-frame--interactive">
                <Image
                  src="/images/teamblender-live-session.webp"
                  alt={locale === 'en'
                    ? 'Hybrid team collaborating live on TeamBlender to strengthen team cohesion'
                    : "Équipe hybride en pleine activité collaborative sur TeamBlender pour renforcer la cohésion d'équipe"}
                  width={1227}
                  height={768}
                  priority
                  sizes="(max-width: 1024px) 90vw, 45vw"
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
                <Users className="h-4 w-4" />
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
