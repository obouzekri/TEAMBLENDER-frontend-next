export default function AuthCard({ title, children, footer }) {
  return (
    <div className="auth-shell">
      <section className="auth-card feature-card" aria-label={title}>
        <h1>{title}</h1>
        {children}
        {footer ? <div className="auth-footer">{footer}</div> : null}
      </section>
    </div>
  );
}
