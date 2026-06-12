import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { cookies } from 'next/headers';

export const metadata = {
  title: 'Legal Notice | TeamBlender',
  description: 'TeamBlender legal notice, hosting, intellectual property and personal data information.',
  robots: 'noindex, follow',
};

const COPY = {
  fr: {
    eyebrow: 'LÉGAL',
    title: 'Mentions légales',
    intro: 'Conformément aux dispositions de la loi n° 2004-575 du 21 juin 2004 pour la Confiance en l Économie Numérique (LCEN).',
    updated: 'Dernière mise à jour : mai 2026',
    sections: [
      {
        title: '1. Éditeur du site',
        body: 'Le présent site TeamBlender est édité par :',
        items: [
          'Raison sociale : [NOM DE LA SOCIÉTÉ OU ENTREPRENEUR]',
          'Forme juridique : [SAS / SARL / EI / Auto-entrepreneur]',
          'Capital social : [MONTANT] €',
          'Numéro SIRET : [SIRET]',
          'Siège social : [ADRESSE COMPLÈTE]',
          'Email : contact@teamblender.io',
          'Directeur de la publication : [NOM DU RESPONSABLE]',
        ],
      },
      {
        title: '2. Hébergement',
        body: 'Le site est hébergé par :',
        items: [
          'Hébergeur : [NOM DE L HÉBERGEUR - ex. Railway, Render, OVH]',
          'Adresse : [ADRESSE DE L HÉBERGEUR]',
          'Site web : [URL DE L HÉBERGEUR]',
        ],
      },
      {
        title: '3. Propriété intellectuelle',
        paragraphs: [
          'L ensemble du contenu du site TeamBlender (textes, images, graphismes, logo, icônes, structure) est la propriété exclusive de l éditeur ou fait l objet d une autorisation d utilisation. Toute reproduction, distribution, modification ou exploitation, même partielle, est strictement interdite sans autorisation écrite préalable.',
          'Les marques et logos présents sur le site sont des marques déposées ou protégées. Leur reproduction sans consentement est constitutive de contrefaçon.',
        ],
      },
      {
        title: '4. Données personnelles',
        paragraphs: [
          'Le traitement des données à caractère personnel collectées via ce site est décrit dans notre Politique de confidentialité. Conformément au RGPD (UE 2016/679), vous disposez d un droit d accès, de rectification, de suppression et de portabilité de vos données.',
          'Pour exercer ces droits, contactez-nous à contact@teamblender.io.',
        ],
      },
      {
        title: '5. Liens hypertextes',
        paragraphs: [
          'Le site peut contenir des liens vers des sites tiers. TeamBlender n exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu ou leurs pratiques en matière de confidentialité.',
        ],
      },
      {
        title: '6. Limitation de responsabilité',
        paragraphs: [
          'TeamBlender s efforce de maintenir les informations publiées à jour et exactes, mais ne peut garantir l exhaustivité ni l absence d erreurs. L éditeur se réserve le droit de modifier le contenu du site à tout moment sans préavis.',
        ],
      },
      {
        title: '7. Droit applicable',
        paragraphs: [
          'Les présentes mentions légales sont régies par le droit français. En cas de litige et à défaut de résolution amiable, les tribunaux français seront seuls compétents.',
        ],
      },
    ],
    privacyLabel: 'Politique de confidentialité',
  },
  en: {
    eyebrow: 'LEGAL',
    title: 'Legal notice',
    intro: 'In accordance with French law no. 2004-575 of June 21, 2004 on trust in the digital economy (LCEN).',
    updated: 'Last update: May 2026',
    sections: [
      {
        title: '1. Website publisher',
        body: 'This TeamBlender website is published by:',
        items: [
          'Company name: [COMPANY NAME OR ENTREPRENEUR]',
          'Legal form: [SAS / SARL / Sole Proprietor]',
          'Share capital: [AMOUNT] EUR',
          'Business registration number: [SIRET]',
          'Registered office: [FULL ADDRESS]',
          'Email: contact@teamblender.io',
          'Publication director: [NAME]',
        ],
      },
      {
        title: '2. Hosting',
        body: 'This website is hosted by:',
        items: [
          'Hosting provider: [HOST NAME - e.g. Railway, Render, OVH]',
          'Address: [HOST ADDRESS]',
          'Website: [HOST URL]',
        ],
      },
      {
        title: '3. Intellectual property',
        paragraphs: [
          'All content on TeamBlender (texts, images, graphics, logo, icons, structure) is the exclusive property of the publisher or used under permission. Any reproduction, distribution, modification or use, even partial, is strictly prohibited without prior written authorization.',
          'Trademarks and logos displayed on this website are registered or protected marks. Any unauthorized reuse constitutes infringement.',
        ],
      },
      {
        title: '4. Personal data',
        paragraphs: [
          'The processing of personal data collected through this site is described in our Privacy Policy. Under GDPR (EU 2016/679), you have rights of access, rectification, deletion, and portability of your data.',
          'To exercise these rights, contact us at contact@teamblender.io.',
        ],
      },
      {
        title: '5. External links',
        paragraphs: [
          'This site may include links to third-party websites. TeamBlender has no control over those sites and declines any responsibility for their content or privacy practices.',
        ],
      },
      {
        title: '6. Limitation of liability',
        paragraphs: [
          'TeamBlender strives to keep published information accurate and up to date but cannot guarantee completeness or absence of errors. The publisher may modify website content at any time without notice.',
        ],
      },
      {
        title: '7. Governing law',
        paragraphs: [
          'These legal notices are governed by French law. In case of dispute and absent amicable resolution, French courts shall have exclusive jurisdiction.',
        ],
      },
    ],
    privacyLabel: 'Privacy policy',
  },
};

export default async function MentionsLegalesPage() {
  const cookieStore = await cookies();
  const locale = String(cookieStore.get('tb_locale')?.value || 'fr').toLowerCase() === 'en' ? 'en' : 'fr';
  const copy = COPY[locale];
  const privacyHref = `/${locale}/politique-confidentialite`;

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
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '1rem' }}>{copy.updated}</p>
        </section>

        <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {copy.sections.map((section) => (
            <section key={section.title}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{section.title}</h2>
              {section.body ? <p style={{ marginBottom: '0.5rem' }}>{section.body}</p> : null}
              {Array.isArray(section.items) ? (
                <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8, color: 'var(--muted)' }}>
                  {section.items.map((item) => {
                    if (item.includes('contact@teamblender.io')) {
                      const [label] = item.split('contact@teamblender.io');
                      return (
                        <li key={item}>
                          <strong>{label}</strong>
                          <a href="mailto:contact@teamblender.io">contact@teamblender.io</a>
                        </li>
                      );
                    }
                    return <li key={item}>{item}</li>;
                  })}
                </ul>
              ) : null}
              {Array.isArray(section.paragraphs)
                ? section.paragraphs.map((paragraph) => (
                  <p key={paragraph} style={{ lineHeight: 1.7, color: 'var(--muted)', marginTop: '0.75rem' }}>
                    {paragraph.includes('Privacy Policy') || paragraph.includes('Politique de confidentialité')
                      ? (
                        <>
                          {locale === 'en' ? 'The processing of personal data collected through this site is described in our ' : 'Le traitement des données à caractère personnel collectées via ce site est décrit dans notre '}
                          <Link href={privacyHref}>{copy.privacyLabel}</Link>
                          {locale === 'en'
                            ? '. Under GDPR (EU 2016/679), you have rights of access, rectification, deletion, and portability of your data.'
                            : '. Conformément au RGPD (UE 2016/679), vous disposez d un droit d accès, de rectification, de suppression et de portabilité de vos données.'}
                        </>
                      )
                      : paragraph}
                  </p>
                ))
                : null}
            </section>
          ))}

        </div>
      </main>
      <Footer />
    </>
  );
}

