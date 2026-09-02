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
            ? 'A short looping preview keeps the interface readable on mobile, with a fullscreen tap when users want details.'
            : 'Un aperçu animé court garde l’interface lisible sur mobile, avec un tap plein écran pour les détails.'}
        </p>
        <Image
          src="/images/labyrinthe-hero.jpg"
          alt="Interface TeamBlender Labyrinthe en session live collaborative"
          width={1600}
          height={1067}
          className="landing-preview-modal__image"
        />
      </div>
    </div>
  );
}
