"use client";

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { translate } from '@/lib/i18n';

export default function LandingStickyCta({ locale, isVisible, heroPrimaryHref, onPrimaryCtaClick }) {
  if (!isVisible) return null;

  return (
    <div className="landing-sticky-cta" role="region" aria-label={translate(locale, 'landingUi.quickSignupAction')}>
      <Link href={heroPrimaryHref} onClick={onPrimaryCtaClick} className="landing-sticky-cta__button">
        <span>{translate(locale, 'landingUi.getStartedFree')}</span>
        <ArrowRight className="rtl-flip h-4 w-4" />
      </Link>
    </div>
  );
}
