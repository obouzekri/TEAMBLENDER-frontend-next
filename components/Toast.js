'use client';

import styles from './Toast.module.css';

const Toast = ({ id, message, type, onRemove }) => {
  const role = type === 'error' ? 'alert' : 'status';

  return (
    <div className={`${styles.toast} ${styles[type]}`} role={role} aria-live={type === 'error' ? 'assertive' : 'polite'}>
      <div className={styles.content}>
        {type === 'loading' && <div className={styles.spinner} aria-hidden="true"></div>}
        <span className={styles.message}>{message}</span>
      </div>
      {type !== 'loading' && (
        <button
          type="button"
          className={styles.close}
          onClick={() => onRemove(id)}
          aria-label="Fermer la notification"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default Toast;
