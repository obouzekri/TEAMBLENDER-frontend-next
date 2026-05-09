'use client';

import styles from './SessionCardSkeleton.module.css';

const SessionCardSkeleton = () => {
  return (
    <div className={styles.skeleton}>
      <div className={styles.header}>
        <div className={styles.title}></div>
        <div className={styles.badge}></div>
      </div>
      <div className={styles.details}>
        <div className={styles.detail}>
          <div className={styles.label}></div>
          <div className={styles.value}></div>
        </div>
        <div className={styles.detail}>
          <div className={styles.label}></div>
          <div className={styles.value}></div>
        </div>
      </div>
      <div className={styles.actions}>
        <div className={styles.button}></div>
        <div className={styles.button}></div>
      </div>
    </div>
  );
};

export default SessionCardSkeleton;
