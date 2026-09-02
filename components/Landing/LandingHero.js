"use client";

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Activity, BarChart3, Sparkles, Users } from 'lucide-react';
import GamifiedIcon from './GamifiedIcon';
import { CHIP_CLASS, PILL_CLASS } from './landingStyles';

export default function LandingHero({
  locale,
  t,
  heroKicker,
  heroMain,
  structuredHeroTitle,
  heroDescription,
  heroPrimaryHref,
  onPrimaryCtaClick,
  heroPrimaryLabel,
  heroSecondaryHref,
  onHeroSecondaryCtaClick,
  heroSecondaryLabel,
  heroTrustBadges,
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
          {(heroKicker.title || heroMain.label) ? (
            <div className="mb-5 flex flex-wrap gap-3">
              <span className={`${CHIP_CLASS} landing-hero-kicker-chip`}>
                <Sparkles className="h-4 w-4 text-indigo-500" />
                {heroKicker.title || heroMain.label}
              </span>
            </div>
          ) : null}

          <span className="block h-2" aria-hidden="true" />

          <h1 className="landing-hero-title max-w-2xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            <span className="block">{structuredHeroTitle}</span>
            {heroMain.subtitle ? <span className="landing-hero-subtitle mt-2 block bg-gradient-to-r from-slate-900 via-slate-700 to-indigo-700 bg-clip-text text-transparent">{heroMain.subtitle}</span> : null}
          </h1>

          <span className="block h-2" aria-hidden="true" />

          <p className="landing-hero-description mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            {heroDescription}
          </p>

          <p className="landing-hero-keyline mt-3 max-w-2xl text-sm font-semibold tracking-wide text-indigo-700 sm:text-base">
            {t('landing.heroKeyline')}
          </p>

          <span className="block h-6" aria-hidden="true" />

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
              onClick={onHeroSecondaryCtaClick}
              className={`${PILL_CLASS} landing-cta-secondary landing-hero-secondary-btn cta-surface`}
            >
              <span>{heroSecondaryLabel}</span>
            </Link>
          </div>

          {heroTrustBadges.length > 0 ? (
            <ul className="landing-hero-trust mt-6" aria-label={locale === 'en' ? 'Trust points' : 'Points de confiance'}>
              {heroTrustBadges.map(({ title, Icon }, index) => (
                <li key={`hero-trust-${index}-${title}`} className="landing-hero-trust-item">
                  <span className="landing-hero-trust-icon" aria-hidden="true">
                    <GamifiedIcon Icon={Icon} index={index} size="xs" />
                  </span>
                  <span>{title}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="landing-hero-product-shell relative lg:translate-x-8 xl:translate-x-14">
          <div className="landing-hero-product-wrap">
            <div className="landing-hero-product-head">
              <div>
                <p className="landing-hero-product-label">{fallback.productPreview}</p>
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
              aria-label={locale === 'en' ? 'Open the live preview in fullscreen' : 'Ouvrir l’aperçu produit en plein écran'}
              onClick={onOpenPreview}
            >
              <figure className="landing-hero-product-frame landing-hero-product-frame--interactive">
                <Image
                  src="/images/teamblender-collab-challenges-illustration.svg"
                  alt="Illustration de défis collaboratifs engageants sur TeamBlender"
                  width={1200}
                  height={800}
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

          <div className="landing-hero-mobile-cta mt-5">
            <Link
              href={heroPrimaryHref}
              onClick={onPrimaryCtaClick}
              className={`${PILL_CLASS} landing-cta-primary landing-hero-primary-btn cta-surface group text-white`}
            >
              <span>{heroPrimaryLabel}</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
