'use client';

import styles from './Toast.module.css';

const Toast = ({ id, message, type, onRemove }) => {
  return (
    <div className={`${styles.toast} ${styles[type]}`} role="alert">
      <div className={styles.content}>
        {type === 'loading' && <div className={styles.spinner}></div>}
        <span className={styles.message}>{message}</span>
      </div>
      {type !== 'loading' && (
        <button
          className={styles.close}
          onClick={() => onRemove(id)}
          aria-label="Dismiss toast"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default Toast;
