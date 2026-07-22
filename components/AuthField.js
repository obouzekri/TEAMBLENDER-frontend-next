export default function AuthField({
  id,
  label,
  icon,
  className = '',
  after = null,
  children,
}) {
  return (
    <label htmlFor={id} className={`auth-field ${className}`.trim()}>
      <span className="auth-field-label">{label}</span>
      <div className="auth-input-shell">
        <span className="auth-input-icon" aria-hidden="true">{icon}</span>
        {children}
        {after ? <span className="auth-input-after">{after}</span> : null}
      </div>
    </label>
  );
}