import Logo from './Logo';

export default function AuthShowcase({
  badge = 'Live Collaborative Sessions',
  title,
  description,
  highlights = [],
  stats = [],
}) {
  return (
    <section className="auth-showcase-card feature-card reveal-up auth-hero-pane" aria-label="Presentation TeamBlender">
      <div className="auth-showcase-header">
        <div className="auth-showcase-brand">
          <Logo size="compact" />
        </div>
        <span className="auth-showcase-badge">{badge}</span>
      </div>

      <div className="auth-showcase-copy">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <div className="auth-showcase-grid" aria-label="Points forts produit">
        {highlights.map((item) => (
          <article key={item.title} className="auth-mini-card">
            <strong>{item.title}</strong>
            <span>{item.text}</span>
          </article>
        ))}
      </div>

      <div className="auth-showcase-stats" aria-label="Indicateurs produit">
        {stats.map((item) => (
          <article key={item.label} className="auth-stat-card">
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </article>
        ))}
      </div>
    </section>
  );
}