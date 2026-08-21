"use client";

import { useState } from 'react';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import useI18n from '@/lib/i18n/useI18n';

const COMPANY_SIZES = {
  fr: ['1 à 10 personnes', '11 à 50 personnes', '51 à 200 personnes', '201 à 500 personnes', '500+ personnes'],
  en: ['1 to 10 people', '11 to 50 people', '51 to 200 people', '201 to 500 people', '500+ people'],
};

const OBJECTIVES = {
  fr: ['Renforcer la cohésion', 'Accueillir de nouveaux collaborateurs', 'Lancer un séminaire', 'Fédérer une équipe hybride', 'Autre objectif RH'],
  en: ['Strengthen cohesion', 'Onboard new employees', 'Launch a seminar', 'Unify a hybrid team', 'Other HR goal'],
};

export default function ContactPage() {
  const { locale, withLocalePath } = useI18n();
  const isEn = locale === 'en';
  const [form, setForm] = useState({
    name: '',
    company: '',
    companySize: '',
    email: '',
    phone: '',
    need: '',
    objective: '',
    message: '',
  });

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openEmail(event) {
    event.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.need.trim() || !form.message.trim()) {
      alert(isEn ? 'Please fill in all required fields.' : 'Veuillez renseigner tous les champs obligatoires.');
      return;
    }

    const subject = encodeURIComponent(`[TeamBlender] ${form.need}`);
    const body = encodeURIComponent(
      `${isEn ? 'Name' : 'Nom'}: ${form.name}\n` +
      `${isEn ? 'Company' : 'Entreprise'}: ${form.company || (isEn ? 'Not provided' : 'Non renseignée')}\n` +
      `${isEn ? 'Company size' : 'Effectif'}: ${form.companySize || (isEn ? 'Not provided' : 'Non renseigné')}\n` +
      `Email: ${form.email}\n` +
      `${isEn ? 'Phone' : 'Téléphone'}: ${form.phone || (isEn ? 'Not provided' : 'Non renseigné')}\n` +
      `${isEn ? 'Need' : 'Besoin'}: ${form.need}\n\n` +
      `${isEn ? 'Objective' : 'Objectif'}: ${form.objective || (isEn ? 'Not provided' : 'Non renseigné')}\n\n` +
      `${isEn ? 'Message' : 'Message'}:\n${form.message}`
    );

    window.location.href = `mailto:contact@teamblender.io?subject=${subject}&body=${body}`;
  }

  return (
    <>
      <TopNav />
      <main className="shell contact-page">
        <section className="contact-hero reveal-up" aria-label={isEn ? 'Contact TeamBlender' : 'Contactez TeamBlender'}>
          <div className="contact-hero__grid">
            <div className="contact-hero__copy">
              <p className="eyebrow">TeamBlender</p>
              <h1>{isEn ? 'Create a team building that truly strengthens your team' : 'Créez un team building qui renforce réellement la cohésion de votre équipe'}</h1>
              <p className="contact-hero__lede">{isEn ? 'Talk with a TeamBlender expert and identify the challenge best aligned with your HR goals.' : 'Échangez avec un expert TeamBlender et découvrez le challenge le plus adapté à vos objectifs RH.'}</p>
              <div className="contact-proof-box">
                <span className="contact-proof-pill">
                  {isEn ? 'Response within 24 business hours' : 'Réponse sous 24h ouvrées'}
                </span>
                <span className="contact-proof-pill">
                  {isEn ? 'Designed for HR and leadership teams' : 'Pensé pour les équipes RH et les managers'}
                </span>
                <span className="contact-proof-pill">
                  {isEn ? 'Premium SaaS experience' : 'Expérience SaaS premium'}
                </span>
              </div>
            </div>

            <aside className="contact-hero__panel" aria-label={isEn ? 'Contact summary' : 'Résumé du contact'}>
              <p className="contact-hero__panel-eyebrow">{isEn ? 'Fast contact' : 'Contact rapide'}</p>
              <strong>{isEn ? 'A clear first exchange, focused on your context and objectives.' : 'Un premier échange clair, centré sur votre contexte et vos objectifs.'}</strong>
              <div className="contact-hero__panel-points">
                <span>{isEn ? 'HR use case and audience' : 'Cas d’usage RH et audience'}</span>
                <span>{isEn ? 'Recommended format and timing' : 'Format et timing recommandés'}</span>
                <span>{isEn ? 'Suitable plan or proposal path' : 'Formule ou parcours adapté'}</span>
              </div>
            </aside>
          </div>
        </section>

        <section className="contact-layout contact-layout--separated">
          <article className="feature-card contact-info-card">
            <h2>{isEn ? 'How to reach us' : 'Comment nous joindre'}</h2>
            <p className="contact-section-intro">{isEn ? 'For scoping, a demo, or an HR question, write to us.' : 'Pour un cadrage, une démonstration ou une question RH, écrivez-nous.'}</p>

            <div className="contact-trust-box highlight-violet contact-trust-box--soft contact-proof-card">
              <p>
                <strong>{isEn ? 'Proof point:' : 'Repère :'}</strong>{' '}
                {isEn ? 'More than 5,000 employees engaged through our challenges.' : 'Plus de 5 000 collaborateurs engagés à travers nos challenges.'}
              </p>
            </div>

            <div className="contact-info-items">
              <div className="contact-info-item">
                <div className="contact-info-icon">✉</div>
                <div className="contact-info-text">
                  <strong>{isEn ? 'Direct email' : 'Email direct'}</strong>
                  <a href="mailto:contact@teamblender.io">contact@teamblender.io</a>
                </div>
              </div>
              <div className="contact-info-item">
                <div className="contact-info-icon">⏱</div>
                <div className="contact-info-text">
                  <strong>{isEn ? 'Response time' : 'Délai de réponse'}</strong>
                  <span>{isEn ? 'Within 24 business hours' : 'Sous 24h ouvrées'}</span>
                </div>
              </div>
              <div className="contact-info-item">
                <div className="contact-info-icon">📋</div>
                <div className="contact-info-text">
                  <strong>{isEn ? 'For fast scoping, share' : 'Pour un cadrage rapide, partagez'}</strong>
                  <span>{isEn ? 'Team size, objective, format, timeline' : 'Taille d\'équipe, objectif, format, échéance'}</span>
                </div>
              </div>
            </div>

            <div className="contact-trust-box highlight-violet contact-trust-box--soft">
              <p>
                {isEn ? 'Not ready yet? ' : 'Pas encore prêt ? '}
                <a href={withLocalePath('/pricing')}>{isEn ? 'See our plans' : 'Consultez nos formules'}</a>
                {isEn ? ' or ' : ' ou '}
                <a href={withLocalePath('/signup')} className="accent-violet" style={{ fontWeight: '700' }}>{isEn ? 'create an account' : 'créez un compte'}</a>
                {isEn ? ' to explore freely.' : ' pour explorer librement.'}
              </p>
            </div>
          </article>

          <article className="feature-card contact-form-card">
            <h2>{isEn ? 'Book a demo' : 'Demander une démonstration'}</h2>
            <p className="contact-section-intro">{isEn ? 'Tell us a little more about your team so we can prepare a useful first exchange.' : 'Donnez-nous quelques repères pour préparer un premier échange utile.'}</p>
            <form className="auth-form contact-form" onSubmit={openEmail}>
              <label>
                {isEn ? 'Full name *' : 'Nom complet *'}
                <input type="text" required value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder={isEn ? 'Ex: Sarah Martin' : 'Ex : Sarah Martin'} />
              </label>

              <label>
                {isEn ? 'Company' : 'Entreprise'}
                <input type="text" value={form.company} onChange={(e) => updateField('company', e.target.value)} placeholder={isEn ? 'Ex: A2D Agency' : 'Ex : Agence A2D'} />
              </label>

              <label>
                {isEn ? 'Company size *' : 'Effectif de l’entreprise *'}
                <select required value={form.companySize} onChange={(e) => updateField('companySize', e.target.value)}>
                  <option value="">{isEn ? 'Select a company size' : 'Sélectionnez un effectif'}</option>
                  {COMPANY_SIZES[locale].map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </label>

              <label>
                {isEn ? 'Work email *' : 'Email professionnel *'}
                <input type="email" required value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="vous@entreprise.com" />
              </label>

              <label>
                {isEn ? 'Phone' : 'Téléphone'}
                <input type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder={isEn ? '+33 6 12 34 56 78' : '+33 6 12 34 56 78'} />
              </label>

              <label>
                {isEn ? 'Main need *' : 'Votre besoin principal *'}
                <select required value={form.need} onChange={(e) => updateField('need', e.target.value)}>
                  <option value="">{isEn ? 'Select a need' : 'Sélectionnez un besoin'}</option>
                  <option value={isEn ? 'Request a demo' : 'Demander une démonstration'}>{isEn ? 'Request a demo' : 'Demander une démonstration'}</option>
                  <option value={isEn ? 'Prepare a team session' : 'Préparer une session d\'équipe'}>{isEn ? 'Prepare a team session' : 'Préparer une session d\'équipe'}</option>
                  <option value={isEn ? 'Explore an HR use case' : 'Explorer un usage RH'}>{isEn ? 'Explore an HR use case' : 'Explorer un usage RH'}</option>
                  <option value={isEn ? 'Ask a product question' : 'Poser une question produit'}>{isEn ? 'Ask a product question' : 'Poser une question produit'}</option>
                </select>
              </label>

              <label>
                {isEn ? 'Team building objective *' : 'Objectif du team building *'}
                <select required value={form.objective} onChange={(e) => updateField('objective', e.target.value)}>
                  <option value="">{isEn ? 'Select an objective' : 'Sélectionnez un objectif'}</option>
                  {OBJECTIVES[locale].map((objective) => (
                    <option key={objective} value={objective}>{objective}</option>
                  ))}
                </select>
              </label>

              <label>
                {isEn ? 'Message *' : 'Message *'}
                <textarea rows={6} required value={form.message} onChange={(e) => updateField('message', e.target.value)} placeholder={isEn ? 'Context, team objective, and expected format.' : 'Contexte, objectif équipe et format envisagé.'} />
              </label>

              <button type="submit" className="btn-primary wide">{isEn ? 'Request a demo' : 'Demander une démonstration'}</button>
            </form>
          </article>
        </section>
      </main>
      <Footer />
      <style jsx global>{`
        .contact-page {
          width: min(100%, 80rem);
          margin: 0 auto;
          padding: 1rem 1rem 2.5rem;
        }

        .contact-page .contact-hero {
          margin-bottom: 2rem;
        }

        .contact-page .contact-hero__grid {
          display: grid;
          grid-template-columns: minmax(0, 1.3fr) minmax(260px, 0.7fr);
          gap: 1.75rem;
          align-items: start;
        }

        .contact-page .contact-hero__copy {
          display: grid;
          gap: 0.95rem;
          max-width: 46rem;
        }

        .contact-page .contact-hero__copy h1 {
          max-width: none;
          margin: 0;
          font-size: clamp(2rem, 3.4vw, 3.2rem);
          line-height: 1.08;
          letter-spacing: -0.03em;
          text-wrap: balance;
        }

        .contact-page .contact-hero__lede {
          margin: 0;
          max-width: 58ch;
          font-size: 1.02rem;
          line-height: 1.7;
          color: var(--text-muted, #cbd5e1);
        }

        .contact-page .contact-hero__panel {
          display: grid;
          gap: 0.85rem;
          align-content: start;
          padding: 1.25rem;
          border-radius: 22px;
          border: 1px solid var(--surface-soft-border, rgba(148, 163, 184, 0.16));
          background: rgba(255, 255, 255, 0.03);
          box-shadow: 0 14px 30px rgba(2, 6, 23, 0.2);
        }

        .contact-page .contact-hero__panel-eyebrow {
          margin: 0;
          font-size: 0.74rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: var(--text-subtle, #94a3b8);
        }

        .contact-page .contact-hero__panel strong {
          font-size: 1.02rem;
          line-height: 1.45;
          color: var(--text-strong, #e2e8f0);
        }

        .contact-page .contact-hero__panel-points {
          display: grid;
          gap: 0.55rem;
          margin-top: 0.2rem;
        }

        .contact-page .contact-hero__panel-points span {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 0.8rem;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(148, 163, 184, 0.12);
          color: var(--text-muted, #cbd5e1);
          font-size: 0.88rem;
          line-height: 1.45;
        }

        .contact-page .contact-layout {
          display: grid;
          grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
          gap: 1.5rem;
          align-items: start;
        }

        .contact-page .contact-info-card,
        .contact-page .contact-form-card {
          padding: 1.5rem 1.4rem 1.3rem;
          border-radius: 24px;
        }

        .contact-page .contact-form-card {
          padding-bottom: 1.15rem;
        }

        .contact-page .contact-info-card h2,
        .contact-page .contact-form-card h2 {
          margin: 0;
          font-size: clamp(1.3rem, 2vw, 1.7rem);
          line-height: 1.2;
          letter-spacing: -0.025em;
          text-wrap: balance;
        }

        .contact-page .contact-section-intro {
          margin: 0.5rem 0 0;
          max-width: 56ch;
          font-size: 0.98rem;
          line-height: 1.6;
          color: var(--text-muted, #cbd5e1);
        }

        .contact-page .contact-proof-card {
          margin-top: 1rem;
        }

        .contact-page .contact-info-items {
          display: grid;
          gap: 0.8rem;
          margin-top: 1rem;
        }

        .contact-page .contact-info-item {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 0.85rem;
          align-items: start;
          padding: 0.95rem;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.14);
          background: rgba(255, 255, 255, 0.03);
        }

        .contact-page .contact-info-icon {
          width: 2.4rem;
          height: 2.4rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(53, 160, 255, 0.18), rgba(124, 58, 237, 0.18));
          font-size: 1.05rem;
        }

        .contact-page .contact-info-text {
          display: grid;
          gap: 0.3rem;
        }

        .contact-page .contact-info-text strong {
          font-size: 0.95rem;
          line-height: 1.35;
          color: var(--text-strong, #e2e8f0);
        }

        .contact-page .contact-info-text a,
        .contact-page .contact-info-text span {
          color: var(--text-muted, #cbd5e1);
          font-size: 0.92rem;
          line-height: 1.5;
        }

        .contact-page .contact-trust-box {
          margin-top: 1rem;
          padding: 0.95rem 1rem;
          border-radius: 16px;
        }

        .contact-page .contact-trust-box p {
          margin: 0;
          line-height: 1.55;
        }

        .contact-page .contact-form {
          display: grid;
          gap: 0.95rem;
          margin-top: 0.9rem;
        }

        .contact-page .contact-form label {
          display: grid;
          gap: 0.45rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-strong, #e2e8f0);
        }

        .contact-page .contact-form input,
        .contact-page .contact-form select,
        .contact-page .contact-form textarea {
          width: 100%;
          min-height: 3rem;
          padding: 0.8rem 0.95rem;
          border-radius: 14px;
          border: 1px solid var(--control-border, rgba(148, 163, 184, 0.24));
          background: rgba(255, 255, 255, 0.04);
          color: var(--text-strong, #e2e8f0);
          font: inherit;
          transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
        }

        .contact-page .contact-form textarea {
          min-height: 8.5rem;
          resize: vertical;
        }

        .contact-page .contact-form input::placeholder,
        .contact-page .contact-form textarea::placeholder {
          color: var(--text-subtle, #94a3b8);
        }

        .contact-page .contact-form input:focus,
        .contact-page .contact-form select:focus,
        .contact-page .contact-form textarea:focus {
          outline: none;
          border-color: rgba(53, 160, 255, 0.5);
          box-shadow: 0 0 0 4px rgba(53, 160, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
        }

        .contact-page .contact-form .wide {
          width: 100%;
          min-height: 3.15rem;
          justify-content: center;
          margin-top: 0.2rem;
          border-radius: 14px;
          font-weight: 700;
          transition: transform 160ms ease, box-shadow 160ms ease;
        }

        .contact-page .contact-form .wide:hover {
          transform: translateY(-1px);
        }

        @media (max-width: 1024px) {
          .contact-page .contact-hero__grid,
          .contact-page .contact-layout {
            grid-template-columns: 1fr;
          }

          .contact-page .contact-hero__panel {
            order: -1;
          }
        }

        @media (max-width: 640px) {
          .contact-page {
            padding: 0.5rem 0.75rem 2rem;
          }

          .contact-page .contact-info-card,
          .contact-page .contact-form-card {
            padding: 1.1rem;
            border-radius: 20px;
          }

          .contact-page .contact-proof-pill {
            width: 100%;
            justify-content: center;
          }

          .contact-page .contact-info-item {
            padding: 0.8rem;
          }
        }
      `}</style>
    </>
  );
}

