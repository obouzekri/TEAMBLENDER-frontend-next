export default function AuthCard({ title, description, children, footer, brand }) {
  return (
    <div className="auth-shell">
      <section className="auth-card feature-card" aria-label={title}>
        {brand ? <div className="auth-card-brand">{brand}</div> : null}
        <div className="auth-card-header">
          <h1>{title}</h1>
          {description ? <p className="auth-card-description">{description}</p> : null}
        </div>
        {children}
        {footer ? <div className="auth-footer">{footer}</div> : null}
      </section>
    </div>
  );
}
