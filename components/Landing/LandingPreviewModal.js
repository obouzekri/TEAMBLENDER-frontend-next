"use client";

import Image from 'next/image';
import { X } from 'lucide-react';
import { heroCaptureAlt, heroCaptureSrc } from './LandingHero';
import { translate } from '@/lib/i18n';

export default function LandingPreviewModal({ locale, isOpen, onClose, fallback }) {
  if (!isOpen) return null;

  return (
    <div
      className="landing-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-label={translate(locale, 'landingUi.livePreviewFullscreenView')}
      onClick={onClose}
    >
      <div className="landing-preview-modal__panel" onClick={(event) => event.stopPropagation()}>
        <div className="landing-preview-modal__head">
          <div>
            <p className="landing-hero-product-title">{fallback.liveExperience}</p>
          </div>
          <button
            type="button"
            className="landing-preview-modal__close"
            aria-label={translate(locale, 'landingUi.closeFullscreenPreview')}
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="landing-preview-modal__copy">
          {translate(locale, 'landingUi.whatTheFacilitatorSeesWhileThe')}
        </p>
        <Image
          src={heroCaptureSrc(locale)}
          alt={heroCaptureAlt(locale)}
          width={1600}
          height={1027}
          className="landing-preview-modal__image"
        />
      </div>
    </div>
  );
}
