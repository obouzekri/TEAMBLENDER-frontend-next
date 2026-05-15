import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Politique de confidentialité | TeamBlender',
  description: "Politique de confidentialité de TeamBlender — comment nous collectons, utilisons et protégeons vos données personnelles.",
  robots: 'noindex, follow',
};

export default function PolitiqueConfidentialitePage() {
  return (
    <>
      <TopNav />
      <main className="shell" style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
        <section style={{ marginBottom: '2rem' }}>
          <p className="eyebrow">RGPD</p>
          <h1>Politique de confidentialité</h1>
          <p style={{ color: 'var(--muted)', marginTop: '0.5rem' }}>
            Nous nous engageons à protéger vos données personnelles. Cette page explique quelles données nous collectons, pourquoi, et comment vous pouvez exercer vos droits.
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '1rem' }}>
            Dernière mise à jour : mai 2026 — Applicable à tous les utilisateurs de la plateforme TeamBlender.
          </p>
        </section>

        <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>1. Responsable du traitement</h2>
            <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8, color: 'var(--muted)' }}>
              <li><strong>Entité :</strong> [NOM DE LA SOCIÉTÉ]</li>
              <li><strong>Adresse :</strong> [ADRESSE]</li>
              <li><strong>Email :</strong> <a href="mailto:contact@teamblender.io">contact@teamblender.io</a></li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>2. Données collectées</h2>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)', marginBottom: '0.5rem' }}>
              Selon votre usage de la plateforme, nous sommes susceptibles de collecter :
            </p>
            <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8, color: 'var(--muted)' }}>
              <li><strong>Données de compte :</strong> nom, prénom, adresse email, mot de passe (chiffré), rôle (manager, RH, participant)</li>
              <li><strong>Données de session :</strong> nom de la session, challenges sélectionnés, résultats des activités, équipes constituées</li>
              <li><strong>Données de navigation :</strong> adresse IP, type de navigateur, pages consultées (si analytics activés)</li>
              <li><strong>Données de contact :</strong> messages envoyés via le formulaire de contact</li>
            </ul>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)', marginTop: '0.75rem' }}>
              Nous ne collectons pas de données sensibles au sens de l&apos;article 9 du RGPD (origine ethnique, opinions politiques, données de santé, etc.).
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>3. Finalités du traitement</h2>
            <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8, color: 'var(--muted)' }}>
              <li>Gestion des comptes utilisateurs et authentification</li>
              <li>Organisation et animation des sessions de team building</li>
              <li>Envoi de notifications liées aux sessions (invitations, confirmations)</li>
              <li>Réponse aux demandes de contact</li>
              <li>Amélioration de la plateforme et analyse d&apos;usage (si analytics)</li>
              <li>Respect des obligations légales et comptables</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>4. Base légale</h2>
            <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8, color: 'var(--muted)' }}>
              <li><strong>Exécution du contrat</strong> — pour la gestion de votre compte et l&apos;accès aux fonctionnalités</li>
              <li><strong>Intérêt légitime</strong> — pour l&apos;amélioration de la plateforme et la prévention de la fraude</li>
              <li><strong>Consentement</strong> — pour l&apos;envoi de communications marketing ou l&apos;activation d&apos;analytics</li>
              <li><strong>Obligation légale</strong> — pour la conservation des données comptables et fiscales</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>5. Durée de conservation</h2>
            <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8, color: 'var(--muted)' }}>
              <li><strong>Données de compte actif :</strong> durée de la relation contractuelle + 3 ans</li>
              <li><strong>Données de session :</strong> 12 mois après la fin de la session</li>
              <li><strong>Données de contact :</strong> 3 ans à compter de la dernière interaction</li>
              <li><strong>Données de navigation :</strong> 13 mois maximum (si analytics activés)</li>
              <li><strong>Données comptables :</strong> 10 ans (obligation légale)</li>
            </ul>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)', marginTop: '0.75rem' }}>
              À l&apos;expiration de ces délais, vos données sont supprimées ou anonymisées.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>6. Destinataires des données</h2>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)', marginBottom: '0.5rem' }}>
              Vos données ne sont pas vendues. Elles peuvent être transmises à :
            </p>
            <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8, color: 'var(--muted)' }}>
              <li><strong>Hébergeur :</strong> [NOM HÉBERGEUR] — pour le stockage sécurisé des données</li>
              <li><strong>Prestataire email :</strong> Brevo (Sendinblue) — pour l&apos;envoi des notifications transactionnelles</li>
              <li><strong>Prestataire de paiement :</strong> Stripe — pour le traitement des abonnements (aucune donnée bancaire stockée sur nos serveurs)</li>
              <li><strong>Autorités compétentes :</strong> uniquement sur demande légale</li>
            </ul>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)', marginTop: '0.75rem' }}>
              Tous nos prestataires sont soumis à des obligations contractuelles strictes de confidentialité et, dans la mesure du possible, hébergent leurs données en Europe.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>7. Vos droits</h2>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)', marginBottom: '1rem' }}>
              Conformément au RGPD, vous disposez des droits suivants. Pour les exercer, contactez-nous à{' '}
              <a href="mailto:contact@teamblender.io">contact@teamblender.io</a>.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
              {[
                { title: "Droit d'accès", desc: "Obtenir une copie de vos données personnelles" },
                { title: "Droit de rectification", desc: "Corriger des données inexactes ou incomplètes" },
                { title: "Droit à l'effacement", desc: "Demander la suppression de vos données" },
                { title: "Droit à la portabilité", desc: "Recevoir vos données dans un format structuré" },
                { title: "Droit d'opposition", desc: "Vous opposer à certains traitements" },
                { title: "Droit à la limitation", desc: "Restreindre temporairement un traitement" },
              ].map(({ title, desc }) => (
                <div key={title} className="card" style={{ padding: '1rem', background: 'var(--surface-alt, #f8f9fb)' }}>
                  <strong style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{title}</strong>
                  <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{desc}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>8. Cookies</h2>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)' }}>
              TeamBlender utilise uniquement des cookies strictement nécessaires au fonctionnement de la plateforme (session, authentification).
              Aucun cookie tiers à des fins publicitaires n&apos;est déposé sans votre consentement explicite.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>9. Réclamation</h2>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)' }}>
              Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la{' '}
              <strong>CNIL</strong> (Commission Nationale de l&apos;Informatique et des Libertés) :{' '}
              <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>10. Modifications</h2>
            <p style={{ lineHeight: 1.7, color: 'var(--muted)' }}>
              Nous nous réservons le droit de modifier cette politique à tout moment. La date de dernière mise à jour figure en haut de page.
              En continuant à utiliser TeamBlender après une modification, vous acceptez la politique mise à jour.
            </p>
          </section>

        </div>

        <p style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
          Voir aussi : <Link href="/mentions-legales">Mentions légales</Link>
        </p>
      </main>
      <Footer />
    </>
  );
}

