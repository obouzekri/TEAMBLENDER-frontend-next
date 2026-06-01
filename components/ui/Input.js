'use client';

import styles from './Input.module.css';

export default function Input({
  id,
  label,
  hint,
  error,
  className = '',
  inputClassName = '',
  ...props
}) {
  return (
    <label htmlFor={id} className={`${styles.field} ${className}`.trim()}>
      {label ? <span className={styles.label}>{label}</span> : null}
      <input id={id} className={`${styles.control} ${inputClassName}`.trim()} {...props} />
      {error ? <p className={styles.error}>{error}</p> : hint ? <p className={styles.help}>{hint}</p> : null}
    </label>
  );
}
