"use client";

import Image from 'next/image';
import { X } from 'lucide-react';

export default function LandingPreviewModal({ locale, isOpen, onClose, fallback }) {
  if (!isOpen) return null;

  return (
    <div
      className="landing-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-label={locale === 'en' ? 'Live preview fullscreen view' : 'Vue plein écran de l’aperçu produit'}
      onClick={onClose}
    >
      <div className="landing-preview-modal__panel" onClick={(event) => event.stopPropagation()}>
        <div className="landing-preview-modal__head">
          <div>
            <p className="landing-hero-product-label">{fallback.productPreview}</p>
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
            ? 'Explore a TeamBlender session, from team instructions and timer to the reference image.'
            : 'Découvrez une session TeamBlender, de la consigne d’équipe au minuteur et à l’image de référence.'}
        </p>
        <Image
          src="/images/teamblender-live-session.png"
          alt={locale === 'en' ? 'TeamBlender CoPuzzle team session' : 'Session d’équipe TeamBlender CoPuzzle'}
          width={1227}
          height={768}
          className="landing-preview-modal__image"
        />
      </div>
    </div>
  );
}
