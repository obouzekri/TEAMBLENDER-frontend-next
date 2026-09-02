"use client";

const GAMIFIED_ICON_TONES = ['indigo', 'cyan', 'teal', 'slate'];

function resolveGamifiedIconTone(index = 0) {
  return GAMIFIED_ICON_TONES[index % GAMIFIED_ICON_TONES.length] || 'indigo';
}

export default function GamifiedIcon({ Icon, index = 0, size = 'md' }) {
  const tone = resolveGamifiedIconTone(index);

  return (
    <span className={`landing-orb-icon landing-orb-icon--${size} landing-orb-icon--${tone}`} aria-hidden="true">
      <span className="landing-orb-icon__halo" />
      <span className="landing-orb-icon__core">
        <Icon className="h-4 w-4" />
      </span>
      <span className="landing-orb-icon__pulse" />
    </span>
  );
}
