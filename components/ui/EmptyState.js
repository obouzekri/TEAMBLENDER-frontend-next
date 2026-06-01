import styles from './EmptyState.module.css';

export default function EmptyState({ icon = '○', title, description, actions = null, className = '' }) {
  return (
    <div className={`${styles.empty} ${className}`.trim()}>
      <div className={styles.icon} aria-hidden="true">{icon}</div>
      {title ? <p className={styles.title}>{title}</p> : null}
      {description ? <p className={styles.text}>{description}</p> : null}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}
