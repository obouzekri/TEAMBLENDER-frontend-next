"use client";

import Image from 'next/image';
import { X } from 'lucide-react';
import { heroCaptureAlt, heroCaptureSrc } from './LandingHero';

export default function LandingPreviewModal({ locale, isOpen, onClose, fallback }) {
  if (!isOpen) return null;

  return (
    <div
      className="landing-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-label={locale === 'en' ? 'Live preview fullscreen view' : 'Activité collaborative en plein écran'}
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
            aria-label={locale === 'en' ? 'Close fullscreen preview' : 'Fermer l’aperçu plein écran'}
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="landing-preview-modal__copy">
          {locale === 'en'
            ? 'What the facilitator sees while the team plays CoPuzzle: the session programme, the shared board, the timer and the reference image.'
            : 'Ce que voit le facilitateur pendant que l’équipe joue à CoPuzzle : le programme de la session, le plateau partagé, le minuteur et l’image de référence.'}
        </p>
        <Image
          src={heroCaptureSrc(locale)}
          alt={heroCaptureAlt(locale)}
          width={1600}
          height={1106}
          className="landing-preview-modal__image"
        />
      </div>
    </div>
  );
}
