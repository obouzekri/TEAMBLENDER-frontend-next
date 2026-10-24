import Link from 'next/link';
import { withLocalePath } from '@/lib/i18n/routing';

export default function LandingFaq({ locale, faq }) {
  return (
    <section className="landing-section-full p-8 sm:p-12" aria-labelledby="landing-faq-title">
      <div className="landing-section-inner">
        <h2 id="landing-faq-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {faq.title}
        </h2>
        <div className="mt-6 space-y-3">
          {faq.items.map(({ question, answer }) => (
            <details key={question} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <summary className="cursor-pointer font-semibold text-slate-900">{question}</summary>
              <p className="mt-3 leading-7 text-slate-700">{answer}</p>
            </details>
          ))}
        </div>
        <p className="mt-6">
          <Link className="font-semibold underline underline-offset-4" href={withLocalePath(locale, '/team-building')}>
            {locale === 'en' ? 'Read the team building guide' : 'Lire le guide du team building'}
          </Link>
        </p>
      </div>
    </section>
  );
}
