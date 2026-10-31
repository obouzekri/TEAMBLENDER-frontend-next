"use client";

import { Timer } from 'lucide-react';

const SITE_TONES = ['indigo', 'cyan', 'teal'];
const AVATAR_TONE_COUNT = 5;

function formatPercent(value, locale) {
  return locale === 'en' ? `${value}%` : `${value} %`;
}

export default function LandingProofSessionPreview({ locale, preview }) {
  if (!preview) return null;

  let avatarIndex = 0;

  return (
    <figure className="landing-proof-visual" aria-label={preview.ariaLabel}>
      <div className="landing-proof-session">
        <div className="landing-proof-session__head">
          <div className="landing-proof-session__title">
            <span className="landing-proof-session__live">
              <span className="landing-proof-session__live-dot" aria-hidden="true" />
              {preview.live}
            </span>
            <strong>{preview.challenge}</strong>
          </div>
          <span className="landing-proof-session__timer">
            <Timer className="h-3.5 w-3.5" aria-hidden="true" />
            {preview.timer}
          </span>
        </div>

        <ul className="landing-proof-session__sites">
          {preview.sites.map(({ icon: Icon, label, people }, index) => (
            <li key={label} className="landing-proof-site">
              <span className={`landing-proof-site__icon landing-proof-tone--${SITE_TONES[index % SITE_TONES.length]}`} aria-hidden="true">
                <Icon className="h-4 w-4" />
              </span>
              <span className="landing-proof-site__text">
                <strong>{label}</strong>
                <span>{people.length} {preview.onlineLabel}</span>
              </span>
              <span className="landing-proof-site__people" aria-hidden="true">
                {people.map((initials) => {
                  const tone = avatarIndex % AVATAR_TONE_COUNT;
                  avatarIndex += 1;
                  return (
                    <span key={initials} className={`landing-proof-avatar landing-proof-avatar--${tone}`}>
                      {initials}
                    </span>
                  );
                })}
              </span>
            </li>
          ))}
        </ul>

        <div className="landing-proof-session__progress">
          <div className="landing-proof-session__progress-head">
            <span>{preview.progressLabel}</span>
            <strong>{formatPercent(preview.progress, locale)}</strong>
          </div>
          <div className="landing-proof-session__bar" aria-hidden="true">
            <span style={{ width: `${preview.progress}%` }} />
          </div>
        </div>
      </div>

      <div className="landing-proof-bubble" aria-hidden="true">
        <span className="landing-proof-avatar landing-proof-avatar--3">{preview.message.from}</span>
        <span className="landing-proof-bubble__text">
          <small>{preview.message.place}</small>
          {preview.message.text}
        </span>
      </div>
    </figure>
  );
}
