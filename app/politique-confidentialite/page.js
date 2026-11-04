import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { normalizeLocale } from '@/lib/i18n/routing';
import { LOCALE_COOKIE } from '@/lib/i18n/detectLocale';
import { translate } from '@/lib/i18n';

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
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
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
            <ul style={{ paddingInlineStart: '1.25rem', lineHeight: 1.8, color: 'var(--muted)' }}>
              <li><strong>{translate(locale, 'privacyPage.entity')}</strong> [NOM DE LA SOCIÉTÉ]</li>
              <li><strong>{translate(locale, 'privacyPage.address')}</strong> [ADRESSE]</li>
              <li><strong>Email :</strong> <a href="mailto:contact@teamblender.io">contact@teamblender.io</a></li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{copy.sections.data}</h2>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)', marginBottom: '0.5rem' }}>
              {translate(locale, 'privacyPage.dependingOnYourPlatformUsageWe')}
            </p>
            <ul style={{ paddingInlineStart: '1.25rem', lineHeight: 1.8, color: 'var(--muted)' }}>
              <li><strong>{translate(locale, 'privacyPage.accountData')}</strong> {translate(locale, 'privacyPage.nameEmailEncryptedPasswordRoleManager')}</li>
              <li><strong>{translate(locale, 'privacyPage.sessionData')}</strong> {translate(locale, 'privacyPage.sessionNameSelectedChallengesActivityResults')}</li>
              <li><strong>{translate(locale, 'privacyPage.navigationData')}</strong> {translate(locale, 'privacyPage.ipAddressBrowserTypeVisitedPages')}</li>
              <li><strong>{translate(locale, 'privacyPage.contactData')}</strong> {translate(locale, 'privacyPage.messagesSentThroughTheContactForm')}</li>
            </ul>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)', marginTop: '0.75rem' }}>
              {translate(locale, 'privacyPage.weDoNotCollectSensitiveData')}
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{copy.sections.purposes}</h2>
            <ul style={{ paddingInlineStart: '1.25rem', lineHeight: 1.8, color: 'var(--muted)' }}>
              <li>{translate(locale, 'privacyPage.userAccountManagementAndAuthentication')}</li>
              <li>{translate(locale, 'privacyPage.organizationAndFacilitationOfTeamSessions')}</li>
              <li>{translate(locale, 'privacyPage.sessionRelatedNotificationsInvitesConfirmations')}</li>
              <li>{translate(locale, 'privacyPage.contactRequestHandling')}</li>
              <li>{translate(locale, 'privacyPage.platformImprovementAndUsageAnalyticsIf')}</li>
              <li>{translate(locale, 'privacyPage.complianceWithLegalAndAccountingObligations')}</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{copy.sections.legal}</h2>
            <ul style={{ paddingInlineStart: '1.25rem', lineHeight: 1.8, color: 'var(--muted)' }}>
              <li><strong>{translate(locale, 'privacyPage.contractPerformance')}</strong> — {translate(locale, 'privacyPage.forAccountManagementAndFeatureAccess')}</li>
              <li><strong>{translate(locale, 'privacyPage.legitimateInterest')}</strong> — {translate(locale, 'privacyPage.forPlatformImprovementAndFraudPrevention')}</li>
              <li><strong>{translate(locale, 'privacyPage.consent')}</strong> — {translate(locale, 'privacyPage.forMarketingCommunicationsOrAnalyticsActivation')}</li>
              <li><strong>{translate(locale, 'privacyPage.legalObligation')}</strong> — {translate(locale, 'privacyPage.forAccountingAndTaxRetentionObligations')}</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{copy.sections.retention}</h2>
            <ul style={{ paddingInlineStart: '1.25rem', lineHeight: 1.8, color: 'var(--muted)' }}>
              <li><strong>{translate(locale, 'privacyPage.activeAccountData')}</strong> {translate(locale, 'privacyPage.durationOfContractualRelation3Years')}</li>
              <li><strong>{translate(locale, 'privacyPage.sessionData')}</strong> {translate(locale, 'privacyPage.n12MonthsAfterSessionEnd')}</li>
              <li><strong>{translate(locale, 'privacyPage.contactData')}</strong> {translate(locale, 'privacyPage.n3YearsFromLastInteraction')}</li>
              <li><strong>{translate(locale, 'privacyPage.navigationData')}</strong> {translate(locale, 'privacyPage.n13MonthsMaximumIfAnalyticsEnabled')}</li>
              <li><strong>{translate(locale, 'privacyPage.accountingData')}</strong> {translate(locale, 'privacyPage.n10YearsLegalObligation')}</li>
            </ul>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)', marginTop: '0.75rem' }}>
              {translate(locale, 'privacyPage.afterThesePeriodsYourDataIs')}
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{copy.sections.recipients}</h2>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)', marginBottom: '0.5rem' }}>
              {translate(locale, 'privacyPage.yourDataIsNeverSoldIt')}
            </p>
            <ul style={{ paddingInlineStart: '1.25rem', lineHeight: 1.8, color: 'var(--muted)' }}>
              <li><strong>{translate(locale, 'privacyPage.hostingProvider')}</strong> [NOM HÉBERGEUR] — {translate(locale, 'privacyPage.forSecureDataHosting')}</li>
              <li><strong>{translate(locale, 'privacyPage.emailProvider')}</strong> Brevo (Sendinblue) — {translate(locale, 'privacyPage.forTransactionalNotifications')}</li>
              <li><strong>{translate(locale, 'privacyPage.paymentProvider')}</strong> Stripe — {translate(locale, 'privacyPage.forSubscriptionProcessingNoBankingData')}</li>
              <li><strong>{translate(locale, 'privacyPage.competentAuthorities')}</strong> {translate(locale, 'privacyPage.onlyUponLegalRequest')}</li>
            </ul>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)', marginTop: '0.75rem' }}>
              {translate(locale, 'privacyPage.allProvidersAreContractuallyBoundBy')}
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{copy.sections.rights}</h2>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)', marginBottom: '1rem' }}>
              {translate(locale, 'privacyPage.underGdprYouHaveTheFollowing')}
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
              {translate(locale, 'privacyPage.teamblenderOnlyUsesStrictlyNecessaryCookies')}
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{copy.sections.complaint}</h2>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)' }}>
              {translate(locale, 'privacyPage.ifYouBelieveYourRightsAre')}
              <strong>{translate(locale, 'privacyPage.cnil')}</strong>{' '}
              <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{copy.sections.changes}</h2>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)' }}>
              {translate(locale, 'privacyPage.weReserveTheRightToModify')}
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

