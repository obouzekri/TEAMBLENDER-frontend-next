"use client";

import { BarChart3, Eye, Gauge, MessageCircle, Users } from 'lucide-react';

const OUTCOME_ICONS = [Users, Gauge, MessageCircle, BarChart3, Eye];

export default function LandingSessionOutcomes({ outcomesSection }) {
  const items = Array.isArray(outcomesSection?.items) ? outcomesSection.items : [];
  if (items.length === 0) return null;

  return (
    <section
      className="landing-section-full landing-offer-section landing-outcomes-section relative overflow-hidden p-6 sm:p-9"
      style={{ '--reveal-delay': '170ms' }}
      aria-label={outcomesSection.title}
    >
      <div className="landing-section-inner relative">
        <header className="landing-outcomes-heading landing-section-heading">
          <div className="landing-offer-head-content">
            <p className="eyebrow landing-section-eyebrow">{outcomesSection.eyebrow}</p>
            <h2 className="landing-section-title">{outcomesSection.title}</h2>
            <p className="landing-offer-subtitle">{outcomesSection.description}</p>
          </div>
        </header>

        <ul className="landing-outcomes-grid" aria-label={outcomesSection.title}>
          {items.map((item, index) => {
            const Icon = OUTCOME_ICONS[index % OUTCOME_ICONS.length];

            return (
              <li key={`${item.label}-${index}`} className="landing-outcome-card">
                <div className="landing-outcome-card__meta">
                  <span className="landing-outcome-card__icon" aria-hidden="true">
                    <Icon size={20} strokeWidth={2} />
                  </span>
                  <span className="landing-outcome-card__number" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3>{item.label}</h3>
                <p>{item.description}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
