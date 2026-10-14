import { getSocialPreviewImage } from '@/lib/siteMetadata';

const socialPreviewImage = getSocialPreviewImage();

export const metadata = {
  title: 'Team building pour renforcer la cohésion | Contact',
  description:
    'Échangez avec un expert TeamBlender pour choisir des défis de team building adaptés à vos objectifs RH, en présentiel, à distance ou en hybride.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'Contactez TeamBlender pour votre team building',
    description:
      'Échangez avec un expert TeamBlender et trouvez les défis adaptés aux objectifs de votre équipe.',
    type: 'website',
    url: '/contact',
    images: [socialPreviewImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contactez TeamBlender pour votre team building',
    description:
      'Échangez avec un expert TeamBlender et trouvez les défis adaptés aux objectifs de votre équipe.',
    images: [socialPreviewImage.url],
  },
};

export default function ContactLayout({ children }) {
  return children;
}
