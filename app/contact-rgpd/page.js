import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { cookies } from 'next/headers';

export const metadata = {
  title: 'Contact RGPD | TeamBlender',
  description: 'Point de contact RGPD TeamBlender pour l\'exercice des droits sur les données personnelles.',
  robots: 'noindex, follow',
};

const COPY = {
  fr: {
    eyebrow: 'RGPD',
    title: 'Contact RGPD',
    intro: 'Pour exercer vos droits (accès, rectification, suppression, limitation, opposition, portabilité), contactez notre point RGPD.',
    updated: 'Dernière mise à jour : 30 juin 2026',
    emailLabel: 'Email dédié',
    email: 'contact@teamblender.io',
    expected: 'Informations à inclure dans votre demande :',
    fields: [
      'Votre nom et votre organisation',
      'L\'adresse email concernée',
      'Le droit que vous souhaitez exercer',
      'Tout élément utile pour identifier les données concernées'
    ],
    timeline: 'Nous accusons réception rapidement et traitons les demandes dans les délais légaux applicables.',
    linksLabel: 'Documents associés :',
    legalNotice: 'Mentions légales',
    privacy: 'Politique de confidentialité',
    terms: 'CGU SaaS B2B'
  },
  en: {
    eyebrow: 'GDPR',
    title: 'GDPR contact',
    intro: 'To exercise your rights (access, rectification, erasure, restriction, objection, portability), contact our GDPR point of contact.',
    updated: 'Last update: June 30, 2026',
    emailLabel: 'Dedicated email',
    email: 'contact@teamblender.io',
    expected: 'Please include in your request:',
    fields: [
      'Your name and organization',
      'The email address concerned',
      'The right you want to exercise',
      'Any useful details to identify the relevant data'
    ],
    timeline: 'We acknowledge requests quickly and process them within applicable legal timelines.',
    linksLabel: 'Related documents:',
    legalNotice: 'Legal notice',
    privacy: 'Privacy policy',
    terms: 'B2B SaaS Terms'
  }
};

export default async function ContactRgpdPage() {
  const cookieStore = await cookies();
  const locale = String(cookieStore.get('tb_locale')?.value || 'fr').toLowerCase() === 'en' ? 'en' : 'fr';
  const copy = COPY[locale];

  return (
    <>
      <TopNav />
      <main className="shell" style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
        <section style={{ marginBottom: '2rem' }}>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p style={{ color: 'var(--muted)', marginTop: '0.5rem' }}>{copy.intro}</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '1rem' }}>{copy.updated}</p>
        </section>

        <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p>
            <strong>{copy.emailLabel}:</strong>{' '}
            <a href={`mailto:${copy.email}`}>{copy.email}</a>
          </p>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{copy.expected}</h2>
            <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8, color: 'var(--muted)' }}>
              {copy.fields.map((field) => <li key={field}>{field}</li>)}
            </ul>
          </section>

          <p style={{ lineHeight: 1.7, color: 'var(--muted)' }}>{copy.timeline}</p>
        </div>

        <p style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
          {copy.linksLabel}{' '}
          <Link href={`/${locale}/mentions-legales`}>{copy.legalNotice}</Link>
          {' · '}
          <Link href={`/${locale}/confidentialite`}>{copy.privacy}</Link>
          {' · '}
          <Link href={`/${locale}/cgu`}>{copy.terms}</Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
