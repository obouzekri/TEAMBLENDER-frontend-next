export default function AuthCard({ title, description, children, footer, brand }) {
  return (
    <div className="auth-shell">
      <section className="auth-card feature-card" aria-label={title || undefined}>
        {brand ? <div className="auth-card-brand">{brand}</div> : null}
        {title || description ? (
          <div className="auth-card-header">
            {title ? <h1>{title}</h1> : null}
            {description ? <p className="auth-card-description">{description}</p> : null}
          </div>
        ) : null}
        {children}
        {footer ? <div className="auth-footer">{footer}</div> : null}
      </section>
    </div>
  );
}
