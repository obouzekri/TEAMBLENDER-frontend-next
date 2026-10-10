import { getSocialPreviewImage } from '@/lib/siteMetadata';

const socialPreviewImage = getSocialPreviewImage();

export const metadata = {
  title: 'Tarifs des défis TeamBlender',
  description:
    'Découvrez des offres TeamBlender adaptées aux managers et RH\u00A0: démarrez avec un essai gratuit de 14 jours, puis évoluez selon vos besoins.',
  openGraph: {
    title: 'Tarifs TeamBlender',
    description:
      'Découvrez des offres TeamBlender adaptées aux managers et RH\u00A0: essai gratuit 14 jours sans carte bancaire, puis évoluez selon vos besoins.',
    type: 'website',
    url: '/pricing',
    images: [socialPreviewImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tarifs TeamBlender',
    description:
      'Découvrez des offres TeamBlender adaptées aux managers et RH\u00A0: essai gratuit 14 jours sans carte bancaire, puis évoluez selon vos besoins.',
    images: [socialPreviewImage.url],
  },
};

export default function PricingLayout({ children }) {
  return children;
}
