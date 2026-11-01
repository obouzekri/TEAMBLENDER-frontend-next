'use client';

import useI18n from '@/lib/i18n/useI18n';
import styles from './ChallengeDebriefHeading.module.css';

// Shared opening of every end-of-challenge summary, so facilitators find the same title in every challenge.
export default function ChallengeDebriefHeading({ children = null }) {
  const { t } = useI18n();
  return (
    <div className={styles.heading}>
      <span className={styles.kicker}>{t('challengeDebrief.kicker')}</span>
      <div className={styles.titleRow}>
        <h2 className={styles.title}>{t('challengeDebrief.title')}</h2>
        {children}
      </div>
    </div>
  );
}
