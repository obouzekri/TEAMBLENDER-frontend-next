"use client";

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function LandingStickyCta({ locale, isVisible, heroPrimaryHref, onPrimaryCtaClick }) {
  if (!isVisible) return null;

  return (
    <div className="landing-sticky-cta" role="region" aria-label={locale === 'en' ? 'Quick signup action' : 'Action rapide d’inscription'}>
      <Link href={heroPrimaryHref} onClick={onPrimaryCtaClick} className="landing-sticky-cta__button">
        <span>{locale === 'en' ? 'Start for free' : 'Démarrer gratuitement'}</span>
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
