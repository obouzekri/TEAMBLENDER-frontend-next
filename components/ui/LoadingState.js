import styles from './LoadingState.module.css';

export default function LoadingState({ text = 'Chargement en cours...', className = '' }) {
  return (
    <div className={`${styles.loading} ${className}`.trim()} role="status" aria-live="polite">
      <div className={styles.spinner} aria-hidden="true" />
      <p className={styles.text}>{text}</p>
    </div>
  );
}
