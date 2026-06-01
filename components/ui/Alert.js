import styles from './Alert.module.css';

export default function Alert({ variant = 'info', title, children, className = '' }) {
  return (
    <div className={`${styles.alert} ${styles[variant] || styles.info} ${className}`.trim()} role="status" aria-live="polite">
      {title ? <p className={styles.title}>{title}</p> : null}
      {children ? <p className={styles.message}>{children}</p> : null}
    </div>
  );
}
