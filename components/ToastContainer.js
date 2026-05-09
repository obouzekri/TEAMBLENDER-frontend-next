'use client';

import Toast from './Toast';
import styles from './Toast.module.css';

const ToastContainer = ({ toasts, onRemove }) => {
  return (
    <div className={styles.toastContainer}>
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
