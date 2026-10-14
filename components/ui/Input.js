'use client';

import styles from './Input.module.css';

export default function Input({
  id,
  label,
  hint,
  error,
  suffix,
  className = '',
  inputClassName = '',
  helpClassName = '',
  ...props
}) {
  return (
    <label htmlFor={id} className={`${styles.field} ${className}`.trim()}>
      {label ? <span className={styles.label}>{label}</span> : null}
      {suffix ? (
        <span className={styles.controlWithSuffix}>
          <input
            id={id}
            className={`${styles.control} ${styles.controlWithSuffixInput} ${inputClassName}`.trim()}
            {...props}
          />
          <span className={styles.suffix} aria-hidden="true">
            {suffix}
          </span>
        </span>
      ) : (
        <input id={id} className={`${styles.control} ${inputClassName}`.trim()} {...props} />
      )}
      {error ? (
        <p className={styles.error}>{error}</p>
      ) : hint ? (
        <p className={`${styles.help} ${helpClassName}`.trim()}>{hint}</p>
      ) : null}
    </label>
  );
}
