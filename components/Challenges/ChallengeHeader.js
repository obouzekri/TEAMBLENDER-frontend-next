'use client';

export default function ChallengeHeader({
  title,
  subtitle = '',
  className = '',
  uppercaseSubtitle = true,
}) {
  const normalizedTitle = String(title || '').trim();
  const normalizedSubtitle = String(subtitle || '').trim();
  const renderedSubtitle = uppercaseSubtitle ? normalizedSubtitle.toUpperCase() : normalizedSubtitle;

  return (
    <header className={['challenge-header', className].filter(Boolean).join(' ')}>
      <div className="challenge-header-line">
        <h1 className="challenge-title">{normalizedTitle}</h1>
        {renderedSubtitle ? <span className="challenge-header-separator">-</span> : null}
        {renderedSubtitle ? <p className="challenge-subtitle">{renderedSubtitle}</p> : null}
      </div>
    </header>
  );
}