import Link from 'next/link';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { withLocalePath } from '@/lib/i18n/routing';

export default function LandingFaq({ locale, faq, eyebrow, intro }) {
  const guideHref = withLocalePath(locale, '/team-building');
  const guideLabel = locale === 'en' ? 'Read the team building guide' : 'Lire le guide du team building';

  if (!eyebrow) {
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
            <Link className="font-semibold underline underline-offset-4" href={guideHref}>{guideLabel}</Link>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="landing-section-full landing-faq-section" aria-labelledby="landing-faq-title">
      <div className="landing-section-inner landing-faq-layout">
        <div className="landing-section-heading landing-faq-head">
          <p className="eyebrow landing-section-eyebrow">{eyebrow}</p>
          <h2 id="landing-faq-title" className="landing-section-title">{faq.title}</h2>
          {intro ? <p className="landing-faq-intro">{intro}</p> : null}
          <Link className="landing-faq-guide group" href={guideHref}>
            <span>{guideLabel}</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
        <div className="landing-faq-list">
          {faq.items.map(({ question, answer }, index) => (
            <details key={question} className="landing-faq-item" open={index === 0}>
              <summary>
                <span>{question}</span>
                <ChevronDown className="landing-faq-chevron h-5 w-5" aria-hidden="true" />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
