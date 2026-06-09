export default function AuthField({
  id,
  label,
  icon,
  className = '',
  children,
}) {
  return (
    <label htmlFor={id} className={`auth-field ${className}`.trim()}>
      <span className="auth-field-label">{label}</span>
      <div className="auth-input-shell">
        <span className="auth-input-icon" aria-hidden="true">{icon}</span>
        {children}
      </div>
    </label>
  );
}