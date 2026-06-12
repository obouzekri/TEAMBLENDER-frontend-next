import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { cookies } from 'next/headers';

export const metadata = {
  title: 'Privacy Policy | TeamBlender',
  description: 'TeamBlender privacy policy: how we collect, use and protect personal data.',
  robots: 'noindex, follow',
};

const RIGHTS = {
  fr: [
    { title: 'Droit d accès', desc: 'Obtenir une copie de vos données personnelles' },
    { title: 'Droit de rectification', desc: 'Corriger des données inexactes ou incomplètes' },
    { title: 'Droit à l effacement', desc: 'Demander la suppression de vos données' },
    { title: 'Droit à la portabilité', desc: 'Recevoir vos données dans un format structuré' },
    { title: 'Droit d opposition', desc: 'Vous opposer à certains traitements' },
    { title: 'Droit à la limitation', desc: 'Restreindre temporairement un traitement' },
  ],
  en: [
    { title: 'Right of access', desc: 'Get a copy of your personal data' },
    { title: 'Right to rectification', desc: 'Correct inaccurate or incomplete data' },
    { title: 'Right to erasure', desc: 'Request deletion of your data' },
    { title: 'Right to portability', desc: 'Receive your data in a structured format' },
    { title: 'Right to object', desc: 'Object to specific processing activities' },
    { title: 'Right to restriction', desc: 'Temporarily restrict a processing activity' },
  ],
};

const COPY = {
  fr: {
    eyebrow: 'RGPD',
    title: 'Politique de confidentialité',
    intro: 'Nous nous engageons à protéger vos données personnelles. Cette page explique quelles données nous collectons, pourquoi, et comment vous pouvez exercer vos droits.',
    updated: 'Dernière mise à jour : mai 2026 - Applicable à tous les utilisateurs de la plateforme TeamBlender.',
    sections: {
      controller: '1. Responsable du traitement',
      data: '2. Données collectées',
      purposes: '3. Finalités du traitement',
      legal: '4. Base légale',
      retention: '5. Durée de conservation',
      recipients: '6. Destinataires des données',
      rights: '7. Vos droits',
      cookies: '8. Cookies',
      complaint: '9. Réclamation',
      changes: '10. Modifications',
      legalNotice: 'Mentions légales',
      seeAlso: 'Voir aussi :',
    },
  },
  en: {
    eyebrow: 'GDPR',
    title: 'Privacy policy',
    intro: 'We are committed to protecting your personal data. This page explains what data we collect, why we collect it, and how you can exercise your rights.',
    updated: 'Last update: May 2026 - Applies to all TeamBlender platform users.',
    sections: {
      controller: '1. Data controller',
      data: '2. Data collected',
      purposes: '3. Processing purposes',
      legal: '4. Legal basis',
      retention: '5. Retention period',
      recipients: '6. Data recipients',
      rights: '7. Your rights',
      cookies: '8. Cookies',
      complaint: '9. Complaint',
      changes: '10. Changes',
      legalNotice: 'Legal notice',
      seeAlso: 'See also:',
    },
  },
};

export default async function PolitiqueConfidentialitePage() {
  const cookieStore = await cookies();
  const locale = String(cookieStore.get('tb_locale')?.value || 'fr').toLowerCase() === 'en' ? 'en' : 'fr';
  const copy = COPY[locale];
  const rights = RIGHTS[locale];
  const legalHref = `/${locale}/mentions-legales`;

  return (
    <>
      <TopNav />
      <main className="shell" style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
        <section style={{ marginBottom: '2rem' }}>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p style={{ color: 'var(--muted)', marginTop: '0.5rem' }}>
            {copy.intro}
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '1rem' }}>
            {copy.updated}
          </p>
        </section>

        <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{copy.sections.controller}</h2>
            <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8, color: 'var(--muted)' }}>
              <li><strong>{locale === 'en' ? 'Entity:' : 'Entité :'}</strong> [NOM DE LA SOCIÉTÉ]</li>
              <li><strong>{locale === 'en' ? 'Address:' : 'Adresse :'}</strong> [ADRESSE]</li>
              <li><strong>Email :</strong> <a href="mailto:contact@teamblender.io">contact@teamblender.io</a></li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{copy.sections.data}</h2>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)', marginBottom: '0.5rem' }}>
              {locale === 'en' ? 'Depending on your platform usage, we may collect:' : 'Selon votre usage de la plateforme, nous sommes susceptibles de collecter :'}
            </p>
            <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8, color: 'var(--muted)' }}>
              <li><strong>{locale === 'en' ? 'Account data:' : 'Données de compte :'}</strong> {locale === 'en' ? 'name, email, encrypted password, role (manager, HR, participant)' : 'nom, prénom, adresse email, mot de passe (chiffré), rôle (manager, RH, participant)'}</li>
              <li><strong>{locale === 'en' ? 'Session data:' : 'Données de session :'}</strong> {locale === 'en' ? 'session name, selected challenges, activity results, team composition' : 'nom de la session, challenges sélectionnés, résultats des activités, équipes constituées'}</li>
              <li><strong>{locale === 'en' ? 'Navigation data:' : 'Données de navigation :'}</strong> {locale === 'en' ? 'IP address, browser type, visited pages (if analytics enabled)' : 'adresse IP, type de navigateur, pages consultées (si analytics activés)'}</li>
              <li><strong>{locale === 'en' ? 'Contact data:' : 'Données de contact :'}</strong> {locale === 'en' ? 'messages sent through the contact form' : 'messages envoyés via le formulaire de contact'}</li>
            </ul>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)', marginTop: '0.75rem' }}>
              {locale === 'en' ? 'We do not collect sensitive data under GDPR Article 9 (ethnic origin, political opinions, health data, etc.).' : 'Nous ne collectons pas de données sensibles au sens de l article 9 du RGPD (origine ethnique, opinions politiques, données de santé, etc.).'}
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{copy.sections.purposes}</h2>
            <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8, color: 'var(--muted)' }}>
              <li>{locale === 'en' ? 'User account management and authentication' : 'Gestion des comptes utilisateurs et authentification'}</li>
              <li>{locale === 'en' ? 'Organization and facilitation of team sessions' : 'Organisation et animation des sessions de team building'}</li>
              <li>{locale === 'en' ? 'Session-related notifications (invites, confirmations)' : 'Envoi de notifications liées aux sessions (invitations, confirmations)'}</li>
              <li>{locale === 'en' ? 'Contact request handling' : 'Réponse aux demandes de contact'}</li>
              <li>{locale === 'en' ? 'Platform improvement and usage analytics (if enabled)' : 'Amélioration de la plateforme et analyse d usage (si analytics)'}</li>
              <li>{locale === 'en' ? 'Compliance with legal and accounting obligations' : 'Respect des obligations légales et comptables'}</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{copy.sections.legal}</h2>
            <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8, color: 'var(--muted)' }}>
              <li><strong>{locale === 'en' ? 'Contract performance' : 'Exécution du contrat'}</strong> — {locale === 'en' ? 'for account management and feature access' : 'pour la gestion de votre compte et l accès aux fonctionnalités'}</li>
              <li><strong>{locale === 'en' ? 'Legitimate interest' : 'Intérêt légitime'}</strong> — {locale === 'en' ? 'for platform improvement and fraud prevention' : 'pour l amélioration de la plateforme et la prévention de la fraude'}</li>
              <li><strong>{locale === 'en' ? 'Consent' : 'Consentement'}</strong> — {locale === 'en' ? 'for marketing communications or analytics activation' : 'pour l envoi de communications marketing ou l activation d analytics'}</li>
              <li><strong>{locale === 'en' ? 'Legal obligation' : 'Obligation légale'}</strong> — {locale === 'en' ? 'for accounting and tax retention obligations' : 'pour la conservation des données comptables et fiscales'}</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{copy.sections.retention}</h2>
            <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8, color: 'var(--muted)' }}>
              <li><strong>{locale === 'en' ? 'Active account data:' : 'Données de compte actif :'}</strong> {locale === 'en' ? 'duration of contractual relation + 3 years' : 'durée de la relation contractuelle + 3 ans'}</li>
              <li><strong>{locale === 'en' ? 'Session data:' : 'Données de session :'}</strong> {locale === 'en' ? '12 months after session end' : '12 mois après la fin de la session'}</li>
              <li><strong>{locale === 'en' ? 'Contact data:' : 'Données de contact :'}</strong> {locale === 'en' ? '3 years from last interaction' : '3 ans à compter de la dernière interaction'}</li>
              <li><strong>{locale === 'en' ? 'Navigation data:' : 'Données de navigation :'}</strong> {locale === 'en' ? '13 months maximum (if analytics enabled)' : '13 mois maximum (si analytics activés)'}</li>
              <li><strong>{locale === 'en' ? 'Accounting data:' : 'Données comptables :'}</strong> {locale === 'en' ? '10 years (legal obligation)' : '10 ans (obligation légale)'}</li>
            </ul>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)', marginTop: '0.75rem' }}>
              {locale === 'en' ? 'After these periods, your data is deleted or anonymized.' : 'À l expiration de ces délais, vos données sont supprimées ou anonymisées.'}
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{copy.sections.recipients}</h2>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)', marginBottom: '0.5rem' }}>
              {locale === 'en' ? 'Your data is never sold. It may be shared with:' : 'Vos données ne sont pas vendues. Elles peuvent être transmises à :'}
            </p>
            <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8, color: 'var(--muted)' }}>
              <li><strong>{locale === 'en' ? 'Hosting provider:' : 'Hébergeur :'}</strong> [NOM HÉBERGEUR] — {locale === 'en' ? 'for secure data hosting' : 'pour le stockage sécurisé des données'}</li>
              <li><strong>{locale === 'en' ? 'Email provider:' : 'Prestataire email :'}</strong> Brevo (Sendinblue) — {locale === 'en' ? 'for transactional notifications' : 'pour l envoi des notifications transactionnelles'}</li>
              <li><strong>{locale === 'en' ? 'Payment provider:' : 'Prestataire de paiement :'}</strong> Stripe — {locale === 'en' ? 'for subscription processing (no banking data stored on our servers)' : 'pour le traitement des abonnements (aucune donnée bancaire stockée sur nos serveurs)'}</li>
              <li><strong>{locale === 'en' ? 'Competent authorities:' : 'Autorités compétentes :'}</strong> {locale === 'en' ? 'only upon legal request' : 'uniquement sur demande légale'}</li>
            </ul>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)', marginTop: '0.75rem' }}>
              {locale === 'en' ? 'All providers are contractually bound by strict confidentiality obligations and, whenever possible, host data in Europe.' : 'Tous nos prestataires sont soumis à des obligations contractuelles strictes de confidentialité et, dans la mesure du possible, hébergent leurs données en Europe.'}
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{copy.sections.rights}</h2>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)', marginBottom: '1rem' }}>
              {locale === 'en' ? 'Under GDPR, you have the following rights. To exercise them, contact us at ' : 'Conformément au RGPD, vous disposez des droits suivants. Pour les exercer, contactez-nous à '}
              <a href="mailto:contact@teamblender.io">contact@teamblender.io</a>.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
              {rights.map(({ title, desc }) => (
                <div key={title} className="card" style={{ padding: '1rem', background: 'var(--surface-alt, #f8f9fb)' }}>
                  <strong style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{title}</strong>
                  <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{desc}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{copy.sections.cookies}</h2>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)' }}>
              {locale === 'en'
                ? 'TeamBlender only uses strictly necessary cookies for platform operation (session, authentication). No third-party advertising cookie is set without your explicit consent.'
                : 'TeamBlender utilise uniquement des cookies strictement nécessaires au fonctionnement de la plateforme (session, authentification). Aucun cookie tiers à des fins publicitaires n est déposé sans votre consentement explicite.'}
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{copy.sections.complaint}</h2>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)' }}>
              {locale === 'en' ? 'If you believe your rights are not respected, you can submit a complaint to the ' : 'Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la '}
              <strong>{locale === 'en' ? 'CNIL' : 'CNIL'}</strong>{' '}
              <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{copy.sections.changes}</h2>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)' }}>
              {locale === 'en'
                ? 'We reserve the right to modify this policy at any time. The last update date is shown at the top of the page. By continuing to use TeamBlender after a change, you accept the updated policy.'
                : 'Nous nous réservons le droit de modifier cette politique à tout moment. La date de dernière mise à jour figure en haut de page. En continuant à utiliser TeamBlender après une modification, vous acceptez la politique mise à jour.'}
            </p>
          </section>

        </div>

        <p style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
          {copy.sections.seeAlso} <Link href={legalHref}>{copy.sections.legalNotice}</Link>
        </p>
      </main>
      <Footer />
    </>
  );
}

