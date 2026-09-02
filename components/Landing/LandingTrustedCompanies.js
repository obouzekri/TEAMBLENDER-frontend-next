"use client";

import TrustedCompanyLogo from './TrustedCompanyLogo';

export default function LandingTrustedCompanies({ locale, trustedCompanies }) {
  return (
    <section
      className="landing-trusted landing-section-full relative overflow-hidden bg-slate-50 p-6 sm:p-10"
      style={{ '--reveal-delay': '165ms' }}
      aria-label={locale === 'en' ? 'Trusted companies' : 'Entreprises de confiance'}
    >
      <div className="landing-section-inner relative">
        <h2 className="landing-trusted-title text-center text-xl font-semibold tracking-normal text-slate-800 sm:text-2xl">
          {trustedCompanies.title}
        </h2>
        <p className="landing-trusted-subtitle mx-auto mt-2 max-w-[820px] text-center text-sm leading-6 text-slate-500">
          {locale === 'en'
            ? 'Leading teams in industry, retail, healthcare and technology rely on structured collaborative formats.'
            : 'Des equipes exigeantes de l\'industrie, du retail, de la sante et de la tech s\'appuient sur des formats collaboratifs structures.'}
        </p>
        <div className="landing-trusted-marquee">
          <div className="landing-trusted-marquee-track">
            <ul
              className="landing-trusted-logos"
              aria-label={locale === 'en' ? 'Trusted company logos' : 'Logos des entreprises'}
            >
              {trustedCompanies.logos.map((company) => (
                <li
                  key={company.name}
                  className="landing-trusted-logo-item opacity-60 grayscale transition-opacity duration-200 hover:opacity-100"
                  title={company.name}
                  style={{ '--trusted-accent': company.accent || '#35507b' }}
                >
                  <span className="landing-trusted-logo-mark" aria-hidden="true">
                    <TrustedCompanyLogo company={company} />
                  </span>
                  <span className="landing-trusted-logo-name">{company.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
