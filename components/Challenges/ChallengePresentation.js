'use client';

import { ChallengeDebriefContext } from '@/lib/challenges/debrief-context';
import styles from './ChallengePresentation.module.css';

export default function ChallengePresentation({ as: Tag = 'div', className = '', isDebrief = false, children }) {
  return (
    <ChallengeDebriefContext.Provider value={isDebrief}>
      <Tag className={`${className}${isDebrief ? ` ${styles.debrief}` : ''}`} data-challenge-debrief={isDebrief || undefined}>
        {children}
      </Tag>
    </ChallengeDebriefContext.Provider>
  );
}
