import { socialPreviewImage } from '@/lib/siteMetadata';

export const metadata = {
  title: 'Tarifs',
  description:
    'Découvrez des offres TeamBlender adaptées aux managers et RH\u00A0: essai gratuit 14 jours sans carte bancaire, puis évoluez selon vos besoins.',
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
