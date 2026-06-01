import styles from './Badge.module.css';

export default function Badge({ variant = 'neutral', className = '', children }) {
  return <span className={`${styles.badge} ${styles[variant] || styles.neutral} ${className}`.trim()}>{children}</span>;
}
