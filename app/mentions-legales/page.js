import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Mentions légales | TeamBlender',
  description: "Mentions légales de la plateforme TeamBlender — éditeur, hébergement, propriété intellectuelle et données personnelles.",
  robots: 'noindex, follow',
};

export default function MentionsLegalesPage() {
  return (
    <>
      <TopNav />
      <main className="shell" style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
        <section style={{ marginBottom: '2rem' }}>
          <p className="eyebrow">LÉGAL</p>
          <h1>Mentions légales</h1>
          <p style={{ color: 'var(--muted)', marginTop: '0.5rem' }}>
            Conformément aux dispositions de la loi n° 2004-575 du 21 juin 2004 pour la Confiance en l&apos;Économie Numérique (LCEN).
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '1rem' }}>Dernière mise à jour : mai 2026</p>
        </section>

        <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>1. Éditeur du site</h2>
            <p style={{ marginBottom: '0.5rem' }}>Le présent site <strong>TeamBlender</strong> est édité par :</p>
            <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8, color: 'var(--muted)' }}>
              <li><strong>Raison sociale :</strong> [NOM DE LA SOCIÉTÉ OU ENTREPRENEUR]</li>
              <li><strong>Forme juridique :</strong> [SAS / SARL / EI / Auto-entrepreneur]</li>
              <li><strong>Capital social :</strong> [MONTANT] €</li>
              <li><strong>Numéro SIRET :</strong> [SIRET]</li>
              <li><strong>Siège social :</strong> [ADRESSE COMPLÈTE]</li>
              <li><strong>Email :</strong> <a href="mailto:contact@teamblender.io">contact@teamblender.io</a></li>
              <li><strong>Directeur de la publication :</strong> [NOM DU RESPONSABLE]</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>2. Hébergement</h2>
            <p style={{ marginBottom: '0.5rem' }}>Le site est hébergé par :</p>
            <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8, color: 'var(--muted)' }}>
              <li><strong>Hébergeur :</strong> [NOM DE L&apos;HÉBERGEUR — ex. Railway, Render, OVH]</li>
              <li><strong>Adresse :</strong> [ADRESSE DE L&apos;HÉBERGEUR]</li>
              <li><strong>Site web :</strong> [URL DE L&apos;HÉBERGEUR]</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>3. Propriété intellectuelle</h2>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)' }}>
              L&apos;ensemble du contenu du site TeamBlender (textes, images, graphismes, logo, icônes, structure) est la propriété exclusive de l&apos;éditeur
              ou fait l&apos;objet d&apos;une autorisation d&apos;utilisation. Toute reproduction, distribution, modification ou exploitation, même partielle,
              est strictement interdite sans autorisation écrite préalable.
            </p>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)', marginTop: '0.75rem' }}>
              Les marques et logos présents sur le site sont des marques déposées ou protégées. Leur reproduction sans consentement est constitutive de contrefaçon.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>4. Données personnelles</h2>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)' }}>
              Le traitement des données à caractère personnel collectées via ce site est décrit dans notre{' '}
              <Link href="/politique-confidentialite">Politique de confidentialité</Link>.
              Conformément au Règlement Général sur la Protection des Données (RGPD — UE 2016/679), vous disposez d&apos;un droit d&apos;accès,
              de rectification, de suppression et de portabilité de vos données.
            </p>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)', marginTop: '0.75rem' }}>
              Pour exercer ces droits, contactez-nous à : <a href="mailto:contact@teamblender.io">contact@teamblender.io</a>
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>5. Liens hypertextes</h2>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)' }}>
              Le site peut contenir des liens vers des sites tiers. TeamBlender n&apos;exerce aucun contrôle sur ces sites et décline toute responsabilité
              quant à leur contenu ou leurs pratiques en matière de confidentialité.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>6. Limitation de responsabilité</h2>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)' }}>
              TeamBlender s&apos;efforce de maintenir les informations publiées à jour et exactes, mais ne peut garantir l&apos;exhaustivité ni l&apos;absence d&apos;erreurs.
              L&apos;éditeur se réserve le droit de modifier le contenu du site à tout moment sans préavis.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>7. Droit applicable</h2>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)' }}>
              Les présentes mentions légales sont régies par le droit français. En cas de litige, et à défaut de résolution amiable,
              les tribunaux français seront seuls compétents.
            </p>
          </section>

        </div>
      </main>
      <Footer />
    </>
  );
}

