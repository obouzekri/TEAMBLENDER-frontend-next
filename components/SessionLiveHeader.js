'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Info, Users } from 'lucide-react';
import { Button } from '@/components/ui';
import useI18n from '@/lib/i18n/useI18n';
import styles from './SessionLiveHeader.module.css';

function resolveChallengeLabel(challenge, isCurrent, currentLabel) {
  const name = String(challenge?.name || challenge?.title || challenge?.engine_key || '').trim();
  if (!name) return isCurrent ? currentLabel : '';
  return name;
}

export default function SessionLiveHeader({
  sessionId,
  sessionName,
  sessionCode,
  participantCount,
  expectedParticipantCount,
  challenges = [],
  activeChallengeId,
  activeChallengeName,
  onAdvance,
  advanceLabel,
  advancing = false,
  showAdvanceButton = true,
}) {
  const { locale, t } = useI18n();
  const isEn = locale === 'en';
  const [infoOpen, setInfoOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState(null);
  const [copied, setCopied] = useState(false);
  const infoRef = useRef(null);
  const popoverRef = useRef(null);
  const copyTimerRef = useRef(null);

  const resolvedSessionName = String(sessionName || '').trim() || sessionId || t('sessionLive.sessionFallbackName');
  const resolvedSessionCode = String(sessionCode || sessionId || '').trim();
  const resolvedActiveChallengeName = String(activeChallengeName || '').trim() || t('sessionLive.noActiveChallengeTitle');
  const resolvedParticipantCount = Number.isFinite(Number(participantCount)) ? Number(participantCount) : 0;
  const resolvedExpectedCount = Number.isFinite(Number(expectedParticipantCount)) ? Number(expectedParticipantCount) : resolvedParticipantCount;
  const orderedChallenges = Array.isArray(challenges) ? challenges : [];
  const sessionInfoLabel = isEn ? 'Session info' : 'Infos de session';
  const sessionCodeLabel = isEn ? 'Session code' : 'Code de la session';
  const copyLabel = isEn ? 'Copy' : 'Copier';
  const copiedLabel = isEn ? 'Copied' : 'Copié';
  const participantSummaryLabel = isEn ? 'Connected / expected participants' : 'Participants connectés / attendus';
  const challengeOrderLabel = isEn ? 'Challenge order' : 'Ordre des challenges';
  const currentChallengeLabel = isEn ? 'Current' : 'En cours';
  const noChallengeLabel = isEn ? 'No active challenge' : 'Aucun challenge actif';

  const challengeRows = useMemo(() => {
    return orderedChallenges.map((challenge, index) => {
      const challengeId = String(challenge?.id ?? challenge?.challenge_id ?? '').trim();
      const isCurrent = challengeId && String(activeChallengeId ?? '').trim() === challengeId;
      return {
        key: `${challengeId || index}-${index}`,
        label: resolveChallengeLabel(challenge, isCurrent, resolvedActiveChallengeName),
        isCurrent,
        index: index + 1,
      };
    });
  }, [activeChallengeId, orderedChallenges, resolvedActiveChallengeName]);

  useEffect(() => {
    if (!infoOpen) {
      setPopoverPosition(null);
      return undefined;
    }

    function updatePosition() {
      const trigger = infoRef.current;
      if (!trigger || typeof window === 'undefined') return;
      const rect = trigger.getBoundingClientRect();
      const viewportPadding = 12;
      const width = Math.min(360, window.innerWidth - viewportPadding * 2);
      const left = Math.min(
        Math.max(viewportPadding, rect.left),
        window.innerWidth - width - viewportPadding
      );
      setPopoverPosition({ top: rect.bottom + 10, left, width });
    }

    function handlePointerDown(event) {
      if (infoRef.current?.contains(event.target)) return;
      if (popoverRef.current?.contains(event.target)) return;
      setInfoOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setInfoOpen(false);
      }
    }

    updatePosition();
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [infoOpen]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  async function handleCopySessionCode() {
    if (!resolvedSessionCode) return;
    try {
      await navigator.clipboard.writeText(resolvedSessionCode);
      setCopied(true);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const infoPopover = infoOpen && popoverPosition ? (
    <div
      ref={popoverRef}
      className={styles.popover}
      role="dialog"
      aria-label={sessionInfoLabel}
      style={{ top: `${popoverPosition.top}px`, left: `${popoverPosition.left}px`, width: `${popoverPosition.width}px` }}
    >
      <div className={styles.popoverSection}>
        <p className={styles.popoverLabel}>{sessionCodeLabel}</p>
        <div className={styles.codeRow}>
          <strong className={styles.codeValue}>{resolvedSessionCode}</strong>
          <Button variant="secondary" size="sm" className={styles.copyButton} onClick={handleCopySessionCode}>
            {copied ? <Check size={14} strokeWidth={2.4} aria-hidden="true" /> : <Copy size={14} strokeWidth={2.4} aria-hidden="true" />}
            <span>{copied ? copiedLabel : copyLabel}</span>
          </Button>
        </div>
      </div>
      <div className={styles.popoverSection}>
        <p className={styles.popoverLabel}>{participantSummaryLabel}</p>
        <strong className={styles.countValue}>
          {resolvedParticipantCount} / {resolvedExpectedCount}
        </strong>
      </div>
      <div className={styles.popoverSection}>
        <p className={styles.popoverLabel}>{challengeOrderLabel}</p>
        <ol className={styles.challengeList}>
          {challengeRows.length > 0 ? challengeRows.map((challenge) => (
            <li key={challenge.key} className={`${styles.challengeItem}${challenge.isCurrent ? ` ${styles.challengeItemCurrent}` : ''}`}>
              <span className={styles.challengeIndex}>{challenge.index}</span>
              <span className={styles.challengeLabel}>{challenge.label || t('sessionLive.noActiveChallengeTitle')}</span>
              {challenge.isCurrent ? <span className={styles.challengeBadge}>{currentChallengeLabel}</span> : null}
            </li>
          )) : (
            <li className={styles.challengeItemEmpty}>{noChallengeLabel}</li>
          )}
        </ol>
      </div>
    </div>
  ) : null;

  return (
    <section className={styles.header}>
      <div className={styles.details}>
        <div className={styles.titleRow}>
          <strong className={styles.sessionName} title={resolvedSessionName}>{resolvedSessionName}</strong>
          <span className={styles.headerChallengeName} title={resolvedActiveChallengeName}>{resolvedActiveChallengeName}</span>
          <span className={styles.participantBadge}>
            <Users aria-hidden="true" size={14} strokeWidth={2} />
            {resolvedParticipantCount}
          </span>
          <div ref={infoRef} className={styles.infoWrap}>
            <button
              type="button"
              className={styles.infoButton}
              aria-expanded={infoOpen}
              aria-label={sessionInfoLabel}
              title={sessionInfoLabel}
              onClick={() => setInfoOpen((current) => !current)}
            >
              <Info size={16} strokeWidth={2.2} aria-hidden="true" />
            </button>
            {infoPopover && typeof document !== 'undefined' ? createPortal(infoPopover, document.body) : null}
          </div>
        </div>
      </div>

      {showAdvanceButton ? (
        <div className={styles.actions}>
          <Button
            variant="primary"
            size="sm"
            className={styles.actionButton}
            onClick={onAdvance}
            disabled={advancing}
          >
            {advancing ? t('sessionLive.inProgress') : (advanceLabel || t('sessionLive.moveToNextChallenge'))}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
