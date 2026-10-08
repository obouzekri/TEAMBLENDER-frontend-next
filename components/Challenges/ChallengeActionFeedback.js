'use client';

import useI18n from '@/lib/i18n/useI18n';
import styles from './ChallengeActionFeedback.module.css';

export default function ChallengeActionFeedback({ feedback }) {
  const { t } = useI18n();
  if (!feedback?.message) return null;
  return <div className={feedback.status === 'failed' ? styles.error : styles.status}>
    <p role={feedback.status === 'failed' ? 'alert' : 'status'}>{feedback.message}</p>
    {feedback.retry ? <button type="button" className="btn-secondary" onClick={feedback.retry}>{t('chatCard.retry')}</button> : null}
  </div>;
}
