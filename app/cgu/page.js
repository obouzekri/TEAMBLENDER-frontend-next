import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { cookies } from 'next/headers';

export const metadata = {
  title: 'CGU SaaS B2B | TeamBlender',
  description: 'Conditions générales d\'utilisation TeamBlender pour un usage SaaS B2B.',
  robots: 'noindex, follow',
};

const COPY = {
  fr: {
    eyebrow: 'CGU',
    title: 'Conditions générales d\'utilisation (SaaS B2B)',
    intro: 'Ces conditions encadrent l\'utilisation de TeamBlender par des organisations professionnelles (managers, RH, facilitateurs).',
    updated: 'Dernière mise à jour : 30 juin 2026',
    sections: [
      {
        title: '1. Périmètre et objet',
        paragraphs: [
          'TeamBlender est un service SaaS B2B de facilitation de sessions de team building. La plateforme est fournie pour un usage professionnel et interne aux organisations clientes.',
          'Les présentes CGU définissent les droits et obligations des parties concernant l\'accès, l\'usage et la disponibilité du service.'
        ]
      },
      {
        title: '2. Rôles et responsabilités',
        paragraphs: [
          'Le client est responsable de la création des comptes, de la gestion des accès et de l\'usage conforme de la plateforme par ses utilisateurs autorisés.',
          'TeamBlender met en œuvre des moyens raisonnables pour fournir un service stable, sécurisé et documenté, sans garantie d\'absence totale d\'interruption.'
        ]
      },
      {
        title: '3. Disponibilité du service',
        paragraphs: [
          'Le service est exploité en mode best effort avec maintenance évolutive et corrective. Des interruptions ponctuelles peuvent intervenir (maintenance, incident, dépendance tiers).',
          'En cas d\'incident majeur, TeamBlender applique ses procédures de reprise et de communication selon la criticité observée.'
        ]
      },
      {
        title: '4. Données et conformité',
        paragraphs: [
          'Le client reste responsable des données qu\'il saisit sur la plateforme et de leur base légale de traitement.',
          'Les principes de traitement des données personnelles, durées de conservation et droits RGPD sont détaillés dans la politique de confidentialité et le point de contact RGPD.'
        ]
      },
      {
        title: '5. Limitation de responsabilité',
        paragraphs: [
          'Sauf faute lourde ou disposition légale impérative, TeamBlender ne pourra être tenu responsable des dommages indirects (perte d\'opportunité, perte d\'image, perte d\'exploitation).',
          'La responsabilité totale de TeamBlender au titre d\'un manquement prouvé est limitée au montant des sommes effectivement versées par le client au titre de la période concernée.'
        ]
      },
      {
        title: '6. Droit applicable',
        paragraphs: [
          'Les présentes CGU sont soumises au droit français. En cas de litige, les parties rechercheront d\'abord une solution amiable avant toute action contentieuse.'
        ]
      }
    ],
    linksLabel: 'Documents associés :',
    legalNotice: 'Mentions légales',
    privacy: 'Politique de confidentialité',
    rgpd: 'Contact RGPD'
  },
  en: {
    eyebrow: 'TERMS',
    title: 'Terms of Use (B2B SaaS)',
    intro: 'These terms govern TeamBlender usage by professional organizations (managers, HR teams, facilitators).',
    updated: 'Last update: June 30, 2026',
    sections: [
      {
        title: '1. Scope and purpose',
        paragraphs: [
          'TeamBlender is a B2B SaaS service for facilitating team-building sessions. The platform is provided for professional internal usage by client organizations.',
          'These terms define both parties\' rights and obligations for access, usage, and service availability.'
        ]
      },
      {
        title: '2. Roles and responsibilities',
        paragraphs: [
          'The client is responsible for account creation, access management, and compliant usage by authorized users.',
          'TeamBlender implements reasonable efforts to provide a stable, secure, and documented service, without guaranteeing zero interruption.'
        ]
      },
      {
        title: '3. Service availability',
        paragraphs: [
          'The service is operated on a best-effort basis with corrective and evolutionary maintenance. Temporary interruptions may occur (maintenance, incidents, third-party dependency).',
          'In case of major incidents, TeamBlender applies recovery and communication procedures according to observed severity.'
        ]
      },
      {
        title: '4. Data and compliance',
        paragraphs: [
          'The client remains responsible for data entered into the platform and its legal basis for processing.',
          'Personal data processing principles, retention periods, and GDPR rights are detailed in the privacy policy and GDPR contact page.'
        ]
      },
      {
        title: '5. Limitation of liability',
        paragraphs: [
          'Except for gross negligence or mandatory legal provisions, TeamBlender is not liable for indirect damages (loss of opportunity, reputation, or business).',
          'TeamBlender total liability for a proven breach is limited to fees effectively paid by the client for the relevant period.'
        ]
      },
      {
        title: '6. Governing law',
        paragraphs: [
          'These terms are governed by French law. In case of dispute, both parties will first seek an amicable resolution before litigation.'
        ]
      }
    ],
    linksLabel: 'Related documents:',
    legalNotice: 'Legal notice',
    privacy: 'Privacy policy',
    rgpd: 'GDPR contact'
  }
};

export default async function CguPage() {
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

        <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {copy.sections.map((section) => (
            <section key={section.title}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} style={{ lineHeight: 1.7, color: 'var(--muted)', marginTop: '0.75rem' }}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>

        <p style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
          {copy.linksLabel}{' '}
          <Link href={`/${locale}/mentions-legales`}>{copy.legalNotice}</Link>
          {' · '}
          <Link href={`/${locale}/confidentialite`}>{copy.privacy}</Link>
          {' · '}
          <Link href={`/${locale}/contact-rgpd`}>{copy.rgpd}</Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
