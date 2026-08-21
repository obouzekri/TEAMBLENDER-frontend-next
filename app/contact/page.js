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
          <p className="eyebrow">TeamBlender</p>
          <h1>{isEn ? 'Create a team building that truly strengthens your team' : 'Créez un team building qui renforce réellement la cohésion de votre équipe'}</h1>
          <p>{isEn ? 'Talk with a TeamBlender expert and identify the challenge best aligned with your HR goals.' : 'Échangez avec un expert TeamBlender et découvrez le challenge le plus adapté à vos objectifs RH.'}</p>
          <div className="contact-proof-box">
            <span className="contact-proof-pill">
              {isEn ? 'Response within 24 business hours' : 'Réponse sous 24h ouvrées'}
            </span>
            <span className="contact-proof-pill">
              {isEn ? 'Designed for HR and leadership teams' : 'Pensé pour les équipes RH et les managers'}
            </span>
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

          <article className="feature-card">
            <h2>{isEn ? 'Book a demo' : 'Demander une démonstration'}</h2>
            <p className="contact-section-intro">{isEn ? 'Tell us a little more about your team so we can prepare a useful first exchange.' : 'Donnez-nous quelques repères pour préparer un premier échange utile.'}</p>
            <form className="auth-form" onSubmit={openEmail}>
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
    </>
  );
}

