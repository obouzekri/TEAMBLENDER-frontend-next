"use client";

import { useState } from 'react';
import { Clock3, Mail } from 'lucide-react';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import useI18n from '@/lib/i18n/useI18n';
import { getApiUrl } from '@/lib/config';
import { fetchWithCsrfRetry, withCsrfHeaders } from '@/lib/csrf';

const COMPANY_SIZES = {
  fr: ['1 à 10 personnes', '11 à 50 personnes', '51 à 200 personnes', '201 à 500 personnes', '500+ personnes'],
  en: ['1 to 10 people', '11 to 50 people', '51 to 200 people', '201 to 500 people', '500+ people'],
};

export default function ContactPage() {
  const { locale, withLocalePath, t } = useI18n();
  const [form, setForm] = useState({
    name: '',
    company: '',
    companySize: '',
    email: '',
    need: '',
    message: '',
    website: '',
  });
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submitRequest(event) {
    event.preventDefault();
    if (status === 'sending') return;

    if (!form.name.trim() || !form.email.trim() || !form.need.trim() || !form.message.trim()) {
      setErrorMessage(t('contactPage.pleaseFillInAllRequiredFields'));
      setStatus('error');
      return;
    }

    setStatus('sending');
    setErrorMessage('');

    try {
      const response = await fetchWithCsrfRetry(getApiUrl('/contact'), {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ ...form, locale }),
      });

      if (!response.ok) {
        throw new Error(response.status === 429 ? 'rate_limited' : 'failed');
      }

      setStatus('success');
    } catch (err) {
      setErrorMessage(err.message === 'rate_limited'
        ? t('contactPage.tooManyRequestsSentPleaseTry')
        : t('contactPage.yourRequestCouldNotBeSent'));
      setStatus('error');
    }
  }

  return (
    <>
      <TopNav />
      <main className="shell contact-page">
        <section className="contact-intro" aria-label={t('contactPage.contactTeamblender')}>
          <div className="contact-intro__grid">
            <div className="contact-intro__copy">
              <h1>{t('contactPage.letSTalkAboutBringingYour')}</h1>
              <p className="contact-intro__lede">{t('contactPage.talkWithATeamblenderExpertAnd')}</p>
            </div>
          </div>
        </section>

        <section className="contact-panel" aria-labelledby="contact-project-title">
          <header className="contact-panel__header">
            <h2 id="contact-project-title">{t('contactPage.tellUsAboutYourProject')}</h2>
            <p className="contact-section-intro">{t('contactPage.aFewDetailsWillHelpUs')}</p>
            <div className="contact-channels">
              <a href="mailto:contact@teamblender.io" className="contact-channel">
                <Mail size={18} aria-hidden="true" />
                <span>contact@teamblender.io</span>
              </a>
              <p className="contact-channel">
                <Clock3 size={18} aria-hidden="true" />
                <span>{t('contactPage.responseWithin24BusinessHours')}</span>
              </p>
            </div>
          </header>
            {status === 'success' ? (
              <div className="contact-success" role="status" aria-live="polite">
                <div className="contact-success__icon" aria-hidden="true">✓</div>
                <strong>{t('contactPage.thankYouYourRequestHasBeen')}</strong>
                <p>{t('contactPage.aMemberOfOurTeamWill')}</p>
              </div>
            ) : (
            <form className="contact-form" onSubmit={submitRequest}>
              <p className="contact-form__required contact-form__full">{t('contactPage.requiredFields')}</p>
              <div className="contact-form__hp" aria-hidden="true">
                <label>
                  Website
                  <input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => updateField('website', e.target.value)} />
                </label>
              </div>
              <label>
                {t('contactPage.fullName')}
                <input type="text" name="name" autoComplete="name" required value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder={t('contactPage.exSarahMartin')} />
              </label>

              <label>
                {t('contactPage.workEmail')}
                <input type="email" name="email" autoComplete="email" required value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder={t('contactPage.youCompanyCom')} />
              </label>

              <label>
                {t('contactPage.companyOptional')}
                <input type="text" name="company" autoComplete="organization" value={form.company} onChange={(e) => updateField('company', e.target.value)} placeholder={t('contactPage.exA2dAgency')} />
              </label>

              <label>
                {t('contactPage.companySizeOptional')}
                <select className={form.companySize ? '' : 'is-placeholder'} value={form.companySize} onChange={(e) => updateField('companySize', e.target.value)}>
                  <option value="">{t('contactPage.selectACompanySize')}</option>
                  {COMPANY_SIZES[locale].map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </label>

              <label className="contact-form__full">
                {t('contactPage.mainNeed')}
                <select className={form.need ? '' : 'is-placeholder'} required value={form.need} onChange={(e) => updateField('need', e.target.value)}>
                  <option value="">{t('contactPage.selectANeed')}</option>
                  <option value={t('contactPage.requestADemo')}>{t('contactPage.requestADemo')}</option>
                  <option value={t('contactPage.prepareATeamSession')}>{t('contactPage.prepareATeamSession')}</option>
                  <option value={t('contactPage.exploreAnHrUseCase')}>{t('contactPage.exploreAnHrUseCase')}</option>
                  <option value={t('contactPage.askAProductQuestion')}>{t('contactPage.askAProductQuestion')}</option>
                </select>
              </label>

              <label className="contact-form__full">
                {t('contactPage.message')}
                <textarea rows={4} required value={form.message} onChange={(e) => updateField('message', e.target.value)} placeholder={t('contactPage.aLittleContextAboutYourTeam')} />
              </label>

              {status === 'error' && errorMessage ? (
                <p className="form-error contact-form__full" role="alert">{errorMessage}</p>
              ) : null}

              <button type="submit" className="btn-primary wide contact-form__full" disabled={status === 'sending'} aria-busy={status === 'sending'}>
                {status === 'sending'
                  ? t('contactPage.sending')
                  : t('contactPage.sendMyRequest')}
              </button>

              <p className="contact-privacy-note contact-form__full">
                {t('contactPage.yourDetailsAreOnlyUsedTo')}
                <a href={withLocalePath('/confidentialite')}>{t('contactPage.privacyPolicy')}</a>
              </p>
            </form>
            )}
        </section>
      </main>
      <Footer />
      <style jsx global>{`
        .contact-page {
          width: min(100%, 70rem);
          margin: 0 auto;
          padding: 1rem 1rem 2.5rem;
        }

        .contact-page .contact-intro {
          margin: 0;
          padding: 1.25rem 0.5rem;
          border: 0;
          background: none;
          box-shadow: none;
          backdrop-filter: none;
        }

        .contact-page .contact-intro__grid {
          display: flex;
          justify-content: center;
        }

        .contact-page .contact-intro__copy {
          display: grid;
          gap: 0.75rem;
          max-width: 46rem;
          justify-items: center;
          text-align: center;
        }

        .contact-page .contact-intro__copy h1 {
          max-width: 24ch;
          margin: 0;
          font-size: clamp(1.8rem, 3.4vw, 2.6rem);
          font-weight: 700;
          line-height: 1.08;
          letter-spacing: -0.03em;
          text-wrap: balance;
        }

        .contact-page .contact-intro__lede {
          margin: 0;
          max-width: 58ch;
          font-size: 1.02rem;
          line-height: 1.7;
          color: var(--text-muted, #cbd5e1);
        }

        .contact-page .contact-intro .eyebrow {
          margin: 0;
          color: var(--text-muted, #cbd5e1);
        }

        .contact-page .contact-panel {
          width: 100%;
          max-width: 70rem;
          min-width: 0;
          margin: 0 auto;
          padding: 1.5rem 2rem;
          border: 1px solid var(--surface-soft-border);
          border-radius: 24px;
          background: var(--surface-panel);
          box-shadow: var(--surface-shadow-soft);
        }

        .contact-page .contact-panel__header {
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--surface-soft-border);
        }

        .contact-page .contact-panel h2 {
          margin: 0;
          font-size: clamp(1.3rem, 2vw, 1.7rem);
          line-height: 1.2;
          letter-spacing: -0.025em;
          text-wrap: balance;
        }

        .contact-page .contact-section-intro {
          margin: 0.5rem 0 0;
          font-size: 0.98rem;
          line-height: 1.6;
          color: var(--text-muted, #cbd5e1);
        }

        .contact-page .contact-channels {
          display: flex;
          flex-wrap: wrap;
          column-gap: 1.5rem;
          row-gap: 0.25rem;
          margin-top: 1rem;
        }

        .contact-page .contact-channel {
          display: inline-flex;
          min-width: 0;
          min-height: 44px;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
          color: var(--text-muted, #cbd5e1);
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .contact-page a.contact-channel {
          color: var(--text-strong, #e2e8f0);
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .contact-page .contact-channel svg {
          flex-shrink: 0;
        }

        .contact-page .contact-channel span {
          overflow-wrap: anywhere;
        }

        .contact-page a.contact-channel:focus-visible {
          outline: 2px solid var(--text-strong, #e2e8f0);
          outline-offset: 4px;
          border-radius: 4px;
        }

        .contact-page .contact-form {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .contact-page .contact-form__full {
          grid-column: 1 / -1;
        }

        .contact-page .contact-form__required {
          margin: 0;
          font-size: 0.82rem;
          color: var(--text-muted, #cbd5e1);
        }

        .contact-page .contact-form label {
          display: grid;
          min-width: 0;
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
          background: var(--field-bg);
          color: var(--text-strong, #e2e8f0);
          font: inherit;
          font-weight: 400;
          transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
        }

        .contact-page .contact-form textarea {
          min-height: 6.5rem;
          resize: vertical;
        }

        .contact-page .contact-form input::placeholder,
        .contact-page .contact-form textarea::placeholder {
          color: var(--field-placeholder, #64748b);
          -webkit-text-fill-color: var(--field-placeholder, #64748b);
        }

        .contact-page .contact-form select.is-placeholder {
          color: var(--field-placeholder, #64748b);
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

        .contact-page .contact-form .wide:disabled {
          opacity: 0.7;
          cursor: progress;
          transform: none;
        }

        .contact-page .contact-form__hp {
          position: absolute;
          clip-path: inset(50%);
          width: 1px;
          height: 1px;
          overflow: hidden;
        }

        .contact-page .contact-privacy-note {
          margin: 0;
          font-size: 0.82rem;
          line-height: 1.5;
          color: var(--text-subtle, #94a3b8);
        }

        .contact-page .contact-privacy-note a {
          color: inherit;
          text-decoration: underline;
        }

        .contact-page .contact-success {
          display: grid;
          justify-items: center;
          gap: 0.6rem;
          margin-top: 1.2rem;
          padding: 2rem 1.25rem;
          border-radius: 18px;
          border: 1px solid rgba(34, 197, 94, 0.3);
          background: rgba(34, 197, 94, 0.08);
          text-align: center;
        }

        .contact-page .contact-success__icon {
          width: 3rem;
          height: 3rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(34, 197, 94, 0.2);
          color: #16a34a;
          font-size: 1.4rem;
          font-weight: 700;
        }

        .contact-page .contact-success strong {
          font-size: 1.1rem;
          color: var(--text-strong, #e2e8f0);
        }

        .contact-page .contact-success p {
          margin: 0;
          max-width: 46ch;
          line-height: 1.6;
          color: var(--text-muted, #cbd5e1);
        }

        @media (max-width: 640px) {
          .contact-page {
            padding: 0.5rem 0.75rem 2rem;
          }

          .contact-page .contact-intro {
            padding: 1rem 0;
          }

          .contact-page .contact-panel {
            padding: 1.1rem;
            border-radius: 20px;
          }

          .contact-page .contact-form {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </>
  );
}
