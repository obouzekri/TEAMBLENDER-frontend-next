'use client';

import Toast from './Toast';
import styles from './Toast.module.css';

const ToastContainer = ({ toasts, onRemove }) => {
  const hasErrorToast = Array.isArray(toasts) && toasts.some((toast) => toast.type === 'error');

  return (
    <div
      className={styles.toastContainer}
      role="region"
      aria-label="Notifications"
      aria-live={hasErrorToast ? 'assertive' : 'polite'}
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

export default ToastContainer;
