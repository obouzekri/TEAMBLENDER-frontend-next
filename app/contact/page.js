"use client";

import { useState } from 'react';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';

export default function ContactPage() {
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
      alert('Veuillez renseigner tous les champs obligatoires.');
      return;
    }

    const subject = encodeURIComponent(`[TeamBlender] ${form.need}`);
    const body = encodeURIComponent(
      `Nom: ${form.name}\n` +
      `Entreprise: ${form.company || 'Non renseignée'}\n` +
      `Email: ${form.email}\n` +
      `Besoin: ${form.need}\n\n` +
      `Message:\n${form.message}`
    );

    window.location.href = `mailto:contact@teamspark.app?subject=${subject}&body=${body}`;
  }

  return (
    <>
      <TopNav />
      <main className="shell contact-page">
        <section className="contact-hero reveal-up" aria-label="Contactez TeamBlender">
          <p className="eyebrow">TeamBlender</p>
          <h1>Parlons de votre prochain team building</h1>
          <p>Cette étape sert à cadrer votre besoin et voir comment lancer un challenge utile pour votre équipe.</p>
        </section>

        <section className="contact-layout">
          <article className="feature-card contact-info-card">
            <h2>Comment nous joindre</h2>
            <p>Pour un cadrage, une démonstration ou une question RH, écrivez-nous.</p>

            <div className="contact-info-items">
              <div className="contact-info-item">
                <div className="contact-info-icon">✉</div>
                <div className="contact-info-text">
                  <strong>Email direct</strong>
                  <a href="mailto:contact@teamspark.app">contact@teamspark.app</a>
                </div>
              </div>
              <div className="contact-info-item">
                <div className="contact-info-icon">⏱</div>
                <div className="contact-info-text">
                  <strong>Délai de réponse</strong>
                  <span>Sous 24 à 48h ouvrées</span>
                </div>
              </div>
              <div className="contact-info-item">
                <div className="contact-info-icon">📋</div>
                <div className="contact-info-text">
                  <strong>Pour un cadrage rapide, partagez</strong>
                  <span>Taille d'équipe, objectif, format, échéance</span>
                </div>
              </div>
            </div>

            <div className="contact-trust-box">
              <p>Pas encore prêt ? <a href="/pricing">Consultez nos formules</a> ou <a href="/signup">créez un compte</a> pour explorer librement.</p>
            </div>
          </article>

          <article className="feature-card">
            <h2>Envoyer un message</h2>
            <form className="auth-form" onSubmit={openEmail}>
              <label>
                Nom complet *
                <input type="text" required value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Ex : Sarah Martin" />
              </label>

              <label>
                Entreprise
                <input type="text" value={form.company} onChange={(e) => updateField('company', e.target.value)} placeholder="Ex : Agence A2D" />
              </label>

              <label>
                Email professionnel *
                <input type="email" required value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="vous@entreprise.com" />
              </label>

              <label>
                Votre besoin principal *
                <select required value={form.need} onChange={(e) => updateField('need', e.target.value)}>
                  <option value="">Sélectionnez un besoin</option>
                  <option value="Demander une démonstration">Demander une démonstration</option>
                  <option value="Préparer une session d'équipe">Préparer une session d'équipe</option>
                  <option value="Explorer un usage RH">Explorer un usage RH</option>
                  <option value="Poser une question produit">Poser une question produit</option>
                </select>
              </label>

              <label>
                Message *
                <textarea rows={6} required value={form.message} onChange={(e) => updateField('message', e.target.value)} placeholder="Contexte, objectif équipe et format envisagé." />
              </label>

              <button type="submit" className="btn-primary wide">Ouvrir mon email →</button>
            </form>
          </article>
        </section>
      </main>
      <Footer />
    </>
  );
}

