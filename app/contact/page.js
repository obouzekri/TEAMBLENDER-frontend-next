"use client";

import { useState } from 'react';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import useI18n from '@/lib/i18n/useI18n';

export default function ContactPage() {
  const { locale, withLocalePath } = useI18n();
  const isEn = locale === 'en';
  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    need: '',
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
      `Email: ${form.email}\n` +
      `${isEn ? 'Need' : 'Besoin'}: ${form.need}\n\n` +
      `${isEn ? 'Message' : 'Message'}:\n${form.message}`
    );

    window.location.href = `mailto:contact@teamblender.io?subject=${subject}&body=${body}`;
  }

  return (
    <>
      <TopNav />
      <main className="shell contact-page">
        <section className="contact-hero feature-card reveal-up" aria-label="Contactez TeamBlender">
          <p className="eyebrow">TeamBlender</p>
          <h1>{isEn ? 'Let us talk about your next team session' : 'Parlons de votre prochain team building'}</h1>
          <p>{isEn ? 'This step helps frame your need and see how to launch a useful challenge for your team.' : 'Cette étape sert à cadrer votre besoin et voir comment lancer un challenge utile pour votre équipe.'}</p>
        </section>

        <section className="contact-layout">
          <article className="feature-card contact-info-card">
            <h2>{isEn ? 'How to reach us' : 'Comment nous joindre'}</h2>
            <p>{isEn ? 'For scoping, a demo, or an HR question, write to us.' : 'Pour un cadrage, une démonstration ou une question RH, écrivez-nous.'}</p>

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
                  <span>{isEn ? 'Within 24 to 48 business hours' : 'Sous 24 à 48h ouvrées'}</span>
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

            <div className="contact-trust-box highlight-violet">
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
            <h2>{isEn ? 'Send a message' : 'Envoyer un message'}</h2>
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
                {isEn ? 'Work email *' : 'Email professionnel *'}
                <input type="email" required value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="vous@entreprise.com" />
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
                {isEn ? 'Message *' : 'Message *'}
                <textarea rows={6} required value={form.message} onChange={(e) => updateField('message', e.target.value)} placeholder={isEn ? 'Context, team objective, and expected format.' : 'Contexte, objectif équipe et format envisagé.'} />
              </label>

              <button type="submit" className="btn-primary wide">{isEn ? 'Open my email app' : 'Ouvrir mon email'}</button>
            </form>
          </article>
        </section>
      </main>
      <Footer />
    </>
  );
}

