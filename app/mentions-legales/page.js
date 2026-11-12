import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { headers } from 'next/headers';
import { normalizeLocale } from '@/lib/i18n/routing';

export const metadata = {
  title: 'Legal Notice | TeamBlender',
  description: 'TeamBlender legal notice, hosting, intellectual property and personal data information.',
  robots: 'noindex, follow',
};


const COPY = {
  fr: {
    title: 'Mentions légales',
    publisher: 'Éditeur : TeamBlender est un projet édité par [Prénom Nom], entrepreneur individuel en cours d’immatriculation (Maroc).',
    director: 'Directeur de la publication : [Prénom Nom].',
    contact: 'Contact :',
    hosting: 'Hébergement : le site et ses données sont hébergés par Railway Corporation, San Francisco, Californie, États-Unis',
    intellectualProperty: 'Propriété intellectuelle : les contenus du site (textes, défis, visuels) et la marque TeamBlender sont protégés. Toute reproduction sans autorisation est interdite.',
    personalData: 'Données personnelles : voir la',
    privacy: 'Politique de confidentialité',
  },
  en: {
    title: 'Legal notice',
    publisher: 'Publisher: TeamBlender is a project published by [First name Last name], a sole proprietor in the process of registration (Morocco).',
    director: 'Publication director: [First name Last name].',
    contact: 'Contact:',
    hosting: 'Hosting: the website and its data are hosted by Railway Corporation, San Francisco, California, United States',
    intellectualProperty: 'Intellectual property: the website content (texts, challenges, visuals) and the TeamBlender brand are protected. Any reproduction without permission is prohibited.',
    personalData: 'Personal data: see the',
    privacy: 'Privacy policy',
  },
  ar: {
    title: 'الإشعار القانوني',
    publisher: 'الناشر: TeamBlender مشروع ينشره [الاسم الشخصي والعائلي]، وهو صاحب مشروع فردي في طور التسجيل (المغرب).',
    director: 'مدير النشر: [الاسم الشخصي والعائلي].',
    contact: 'التواصل:',
    hosting: 'الاستضافة: يستضيف الموقع وبياناته Railway Corporation، سان فرانسيسكو، كاليفورنيا، الولايات المتحدة',
    intellectualProperty: 'الملكية الفكرية: محتويات الموقع (النصوص والتحديات والعناصر المرئية) والعلامة TeamBlender محمية. يُحظر أي نسخ دون إذن.',
    personalData: 'البيانات الشخصية: راجع',
    privacy: 'سياسة الخصوصية',
  },
};

export default async function MentionsLegalesPage() {
  const requestHeaders = await headers();
  const locale = normalizeLocale(requestHeaders.get('x-teamblender-locale'));
  const copy = COPY[locale];

  return (
    <>
      <TopNav />
      <main className="shell" dir={locale === 'ar' ? 'rtl' : 'ltr'} style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
        <h1>{copy.title}</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem', lineHeight: 1.7 }}>
          <p>{copy.publisher}</p>
          <p>{copy.director}</p>
          <p>{copy.contact} <a href="mailto:contact@teamblender.io" dir="ltr">contact@teamblender.io</a></p>
          <p>{copy.hosting} — <a href="https://railway.com" dir="ltr">https://railway.com</a></p>
          <p>{copy.intellectualProperty}</p>
          <p>{copy.personalData} <Link href={`/${locale}/politique-confidentialite`}>{copy.privacy}</Link>.</p>
        </div>
      </main>
      <Footer />
    </>
  );
}

