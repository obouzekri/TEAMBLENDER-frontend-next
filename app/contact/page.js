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

    const subject = encodeURIComponent(`[TEAMSPARK] ${form.need}`);
    const body = encodeURIComponent(
      `Nom: ${form.name}\n` +
      `Entreprise: ${form.company || 'Non renseignee'}\n` +
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
        <section className="hero contact-hero">
          <p className="eyebrow">TEAMSPARK</p>
          <h1>Parlons de votre prochain team building</h1>
          <p>Cette etape sert a cadrer votre besoin et voir comment lancer un challenge utile pour votre equipe.</p>
        </section>

        <section className="contact-layout">
          <article className="feature-card">
            <h2>Comment nous joindre</h2>
            <p>Pour un cadrage, une demo MVP ou une question RH, ecrivez-nous.</p>
            <ul className="contact-list">
              <li><strong>Email:</strong> <a href="mailto:contact@teamspark.app">contact@teamspark.app</a></li>
              <li><strong>Delai:</strong> reponse en 24 a 48h ouvrees.</li>
              <li><strong>A partager:</strong> taille d equipe, objectif, format, echeance.</li>
            </ul>
          </article>

          <article className="feature-card">
            <h2>Envoyer un message</h2>
            <form className="auth-form" onSubmit={openEmail}>
              <label>
                Nom complet *
                <input type="text" required value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Ex: Sarah Martin" />
              </label>

              <label>
                Entreprise
                <input type="text" value={form.company} onChange={(e) => updateField('company', e.target.value)} placeholder="Ex: Agence A2D" />
              </label>

              <label>
                Email professionnel *
                <input type="email" required value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="vous@entreprise.com" />
              </label>

              <label>
                Votre besoin principal *
                <select required value={form.need} onChange={(e) => updateField('need', e.target.value)}>
                  <option value="">Selectionnez un besoin</option>
                  <option value="Demander une demonstration">Demander une demonstration</option>
                  <option value="Preparer une session d equipe">Preparer une session d equipe</option>
                  <option value="Explorer un usage RH">Explorer un usage RH</option>
                  <option value="Poser une question produit">Poser une question produit</option>
                </select>
              </label>

              <label>
                Message *
                <textarea rows={6} required value={form.message} onChange={(e) => updateField('message', e.target.value)} placeholder="Contexte, objectif equipe et format envisage." />
              </label>

              <button type="submit" className="btn-primary wide">Ouvrir mon email</button>
            </form>
          </article>
        </section>
      </main>
      <Footer />
    </>
  );
}
