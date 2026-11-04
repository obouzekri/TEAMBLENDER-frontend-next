'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Info, Settings2, UserRoundCog, Users, X } from 'lucide-react';
import { Button } from '@/components/ui';
import useI18n from '@/lib/i18n/useI18n';
import { getApiUrl } from '@/lib/config';
import { getAuthHeaders } from '@/lib/auth';
import { fetchWithCsrfRetry } from '@/lib/csrf';
import styles from './SessionLiveHeader.module.css';
import RecoveryLinkDisplay from './RecoveryLinkDisplay';

function resolveChallengeLabel(challenge, isCurrent, currentLabel) {
  const name = String(challenge?.name || challenge?.title || challenge?.engine_key || '').trim();
  if (!name) return isCurrent ? currentLabel : '';
  return name;
}

function trapDialogFocus(event) {
  if (event.key !== 'Tab') return;
  const controls = [
    ...event.currentTarget.querySelectorAll(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), [href]'
    ),
  ];
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

export default function SessionLiveHeader({
  sessionId,
  sessionName,
  sessionCode,
  participantCount,
  expectedParticipantCount,
  sessionObjective,
  onContextUpdated = null,
  onEditSessionInfo = null,
  canManageParticipants = false,
  challenges = [],
  activeChallengeId,
  activeChallengeName,
  onAdvance,
  advanceLabel,
  advancing = false,
  showAdvanceButton = true,
  challengeSlotRef = null,
}) {
  const { locale, t } = useI18n();
  const [infoOpen, setInfoOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const infoRef = useRef(null);
  const popoverRef = useRef(null);
  const copyTimerRef = useRef(null);
  const managementRef = useRef(null);
  const [managementOpen, setManagementOpen] = useState(false);
  const [management, setManagement] = useState(null);
  const [managementError, setManagementError] = useState('');
  const [removing, setRemoving] = useState(false);
  const [removal, setRemoval] = useState(null);
  const [recoveryParticipant, setRecoveryParticipant] = useState(null);
  const [recoveryLink, setRecoveryLink] = useState(null);
  const [recovering, setRecovering] = useState(false);
  const contextRef = useRef(null);
  const [contextOpen, setContextOpen] = useState(false);
  const [contextDraft, setContextDraft] = useState({
    expected_participant_count: '',
    objective: '',
  });
  const [contextError, setContextError] = useState('');
  const [contextSaving, setContextSaving] = useState(false);
  const [savedContext, setSavedContext] = useState(null);
  const manageLabel = t('liveSession.manageParticipants');
  const closeLabel = t('liveSession.close');
  const closeDialogLabel = t('liveSession.closeDialog');
  const objectiveLabels = {
    cohesion: t('liveSession.teamCohesion'),
    communication: t('liveSession.communication'),
    collaboration: t('liveSession.collaboration'),
    leadership: t('liveSession.leadership'),
    'resolution-problemes': t('liveSession.problemSolving'),
    creativite: t('liveSession.creativity'),
    'intelligence-collective': t('liveSession.collectiveIntelligence'),
  };
  const parseObjectiveKeys = (value) =>
    value == null || value === ''
      ? []
      : String(value)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
  const objectiveKeys = Object.keys(objectiveLabels);
  const displayedObjective = savedContext?.objective ?? sessionObjective;
  const displayedObjectiveKeys = parseObjectiveKeys(displayedObjective).filter((key) =>
    objectiveKeys.includes(key)
  );
  const displayedObjectiveLabel = displayedObjectiveKeys
    .map((key) => objectiveLabels[key])
    .join(' · ');
  const displayedExpectedCount = savedContext
    ? savedContext.expected_participant_count
    : expectedParticipantCount;

  function openContextEditor() {
    setInfoOpen(false);
    if (onEditSessionInfo) {
      onEditSessionInfo();
      return;
    }
    setContextDraft({
      expected_participant_count: displayedExpectedCount ?? '',
      objective: displayedObjectiveKeys.join(','),
    });
    setContextError('');
    setContextOpen(true);
  }

  useEffect(() => {
    if (contextOpen) contextRef.current?.showModal();
    else contextRef.current?.close();
  }, [contextOpen]);

  useEffect(() => {
    setSavedContext(null);
  }, [sessionId, expectedParticipantCount, sessionObjective]);

  async function saveContext(event) {
    event.preventDefault();
    const expected =
      contextDraft.expected_participant_count === ''
        ? null
        : Number(contextDraft.expected_participant_count);
    if (
      expected != null &&
      (!Number.isInteger(expected) || expected < 1 || expected > 2147483647)
    ) {
      setContextError(
        t('liveSession.expectedCountMustBeAPositive')
      );
      return;
    }
    setContextSaving(true);
    setContextError('');
    try {
      const normalizedObjective = objectiveKeys
        .filter((key) => parseObjectiveKeys(contextDraft.objective).includes(key))
        .join(',');
      const fields = {
        expected_participant_count: expected,
        objective: normalizedObjective || null,
      };
      const res = await fetchWithCsrfRetry(getApiUrl(`/sessions/${encodeURIComponent(sessionId)}`), {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(fields),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || `Error ${res.status}`);
      setSavedContext(fields);
      onContextUpdated?.(data);
      setContextOpen(false);
    } catch (error) {
      setContextError(error.message);
    } finally {
      setContextSaving(false);
    }
  }

  async function loadManagement() {
    const res = await fetch(
      getApiUrl(`/sessions/${encodeURIComponent(sessionId)}/participant-management`),
      { headers: getAuthHeaders(), credentials: 'include' }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `${t('liveSession.error')} ${res.status}`);
    setManagement(data);
  }

  async function restoreAccess() {
    if (!recoveryParticipant || recovering) return;
    setRecovering(true);
    setManagementError('');
    try {
      const res = await fetchWithCsrfRetry(
        getApiUrl(
          `/sessions/${encodeURIComponent(sessionId)}/participant-management/${encodeURIComponent(recoveryParticipant.id)}/recovery`
        ),
        {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || `Erreur ${res.status}`);
      setRecoveryLink(data);
    } catch (error) {
      setManagementError(error.message);
    } finally {
      setRecovering(false);
    }
  }

  useEffect(() => {
    if (!canManageParticipants || !sessionId) return undefined;
    let cancelled = false;
    async function refresh() {
      try {
        const res = await fetch(
          getApiUrl(`/sessions/${encodeURIComponent(sessionId)}/participant-management`),
          { headers: getAuthHeaders(), credentials: 'include' }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
        if (!cancelled) {
          setManagement(data);
          setManagementError('');
        }
      } catch (error) {
        if (!cancelled) {
          setManagement(null);
          setManagementError(error.message);
        }
      }
    }
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [canManageParticipants, sessionId, activeChallengeId]);

  useEffect(() => {
    if (managementOpen) managementRef.current?.showModal();
    else managementRef.current?.close();
  }, [managementOpen]);

  async function confirmRemoval() {
    if (!removal || removing) return;
    setRemoving(true);
    setManagementError('');
    try {
      const res = await fetchWithCsrfRetry(
        getApiUrl(
          `/sessions/${encodeURIComponent(sessionId)}/participant-management/${encodeURIComponent(removal.participant.id)}/remove`
        ),
        {
          method: 'POST',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            scope: removal.scope,
            active_challenge_id: management.active_challenge_id,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setRemoval(null);
      await loadManagement();
    } catch (error) {
      setManagementError(error.message);
    } finally {
      setRemoving(false);
    }
  }

  const resolvedSessionName =
    String(sessionName || '').trim() || sessionId || t('sessionLive.sessionFallbackName');
  const resolvedSessionCode = String(sessionCode || sessionId || '').trim();
  const resolvedActiveChallengeName =
    String(activeChallengeName || '').trim() || t('sessionLive.noActiveChallengeTitle');
  const presenceAvailable = management?.participants?.every(
    (participant) => participant.presence !== 'unavailable'
  );
  const resolvedParticipantCount = canManageParticipants
    ? presenceAvailable
      ? management.participants.filter((participant) => participant.presence === 'connected').length
      : null
    : Number.isFinite(Number(participantCount))
      ? Number(participantCount)
      : 0;
  const resolvedExpectedCount =
    displayedExpectedCount != null && Number.isFinite(Number(displayedExpectedCount))
      ? Number(displayedExpectedCount)
      : null;
  const orderedChallenges = Array.isArray(challenges) ? challenges : [];
  const sessionInfoLabel = t('liveSession.sessionInfo');
  const sessionCodeLabel = t('liveSession.sessionCode');
  const copyLabel = t('liveSession.copy');
  const copiedLabel = t('liveSession.copied');
  const participantSummaryLabel = canManageParticipants
    ? t('liveSession.connectedExpectedParticipants')
    : t('liveSession.assignedExpectedParticipants');
  const challengeOrderLabel = t('liveSession.challengeOrder');
  const currentChallengeLabel = t('liveSession.current');
  const noChallengeLabel = t('liveSession.noActiveChallenge');

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
    if (!infoOpen) return undefined;

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

    popoverRef.current?.querySelector('button')?.focus();
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
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

  const infoPopover = infoOpen ? (
    <div className={styles.popoverBackdrop} role="presentation">
      <div
        ref={popoverRef}
        className={styles.popover}
        role="dialog"
        aria-modal="true"
        aria-label={sessionInfoLabel}
        onKeyDown={trapDialogFocus}
      >
        <div className={styles.popoverHeader}>
          <h2 className={styles.popoverTitle}>{sessionInfoLabel}</h2>
          <button
            type="button"
            className={styles.popoverClose}
            aria-label={closeLabel}
            onClick={() => setInfoOpen(false)}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.popoverSection}>
          <p className={styles.popoverLabel}>{sessionCodeLabel}</p>
          <div className={styles.codeRow}>
            <strong className={styles.codeValue}>{resolvedSessionCode}</strong>
            <Button
              variant="secondary"
              size="sm"
              className={styles.copyButton}
              onClick={handleCopySessionCode}
            >
              {copied ? (
                <Check size={14} strokeWidth={2.4} aria-hidden="true" />
              ) : (
                <Copy size={14} strokeWidth={2.4} aria-hidden="true" />
              )}
              <span>{copied ? copiedLabel : copyLabel}</span>
            </Button>
          </div>
        </div>
        <div className={styles.popoverSection}>
          <p className={styles.popoverLabel}>{participantSummaryLabel}</p>
          <div className={styles.participantSummary}>
            <strong className={styles.countValue}>
              {resolvedParticipantCount ?? '—'} <span>/ {resolvedExpectedCount ?? '—'}</span>
            </strong>
            <p className={styles.registeredCount}>
              {t('liveSession.registered')} :{' '}
              {Number.isFinite(Number(participantCount)) ? Number(participantCount) : '—'}
            </p>
          </div>
          {resolvedExpectedCount == null ? (
            <p className={styles.popoverNote}>
              {t('liveSession.expectedAttendanceNotSpecified')}
            </p>
          ) : null}
          {canManageParticipants ? (
            <Button
              variant="secondary"
              size="sm"
              className={styles.sectionAction}
              onClick={() => {
                setInfoOpen(false);
                setManagementOpen(true);
              }}
            >
              {manageLabel}
            </Button>
          ) : null}
        </div>
        {displayedObjectiveLabel || canManageParticipants ? (
          <div className={styles.popoverSection}>
            <p className={styles.popoverLabel}>{t('liveSession.objectives')}</p>
            {displayedObjectiveLabel ? (
              <p className={styles.objectiveValue}>{displayedObjectiveLabel}</p>
            ) : (
              <p className={styles.popoverNote}>
                {t('liveSession.noObjectiveSpecified')}
              </p>
            )}
            {canManageParticipants ? (
              <Button
                variant="secondary"
                size="sm"
                className={styles.sectionAction}
                onClick={openContextEditor}
              >
                {t('liveSession.editSessionInfo')}
              </Button>
            ) : null}
          </div>
        ) : null}
        <div className={styles.popoverSection}>
          <p className={styles.popoverLabel}>{challengeOrderLabel}</p>
          <ol className={styles.challengeList}>
            {challengeRows.length > 0 ? (
              challengeRows.map((challenge) => (
                <li
                  key={challenge.key}
                  className={`${styles.challengeItem}${challenge.isCurrent ? ` ${styles.challengeItemCurrent}` : ''}`}
                >
                  <span className={styles.challengeIndex}>{challenge.index}</span>
                  <span className={styles.challengeLabel}>
                    {challenge.label || t('sessionLive.noActiveChallengeTitle')}
                  </span>
                  {challenge.isCurrent ? (
                    <span className={styles.challengeBadge}>{currentChallengeLabel}</span>
                  ) : null}
                </li>
              ))
            ) : (
              <li className={styles.challengeItemEmpty}>{noChallengeLabel}</li>
            )}
          </ol>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <section className={styles.header}>
      <div className={styles.topRow}>
        <div className={styles.details}>
          <div className={styles.titleRow}>
            <strong className={styles.sessionName} title={resolvedSessionName}>
              {resolvedSessionName}
            </strong>
            <div ref={infoRef} className={styles.infoWrap}>
              <button
                type="button"
                className={styles.infoButton}
                aria-expanded={infoOpen}
                aria-haspopup="dialog"
                aria-label={sessionInfoLabel}
                onClick={() => setInfoOpen((current) => !current)}
              >
                <Info size={16} strokeWidth={2.3} aria-hidden="true" />
              </button>
              <span className={styles.infoTooltip} role="tooltip">
                {sessionInfoLabel}
              </span>
              {infoPopover && typeof document !== 'undefined'
                ? createPortal(infoPopover, document.body)
                : null}
            </div>
            <span className={styles.participantBadge}>
              <Users aria-hidden="true" size={14} strokeWidth={2} />
              {resolvedParticipantCount ?? '—'}
            </span>
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
              {advancing
                ? t('sessionLive.inProgress')
                : advanceLabel || t('sessionLive.moveToNextChallenge')}
            </Button>
          </div>
        ) : null}
      </div>

      <div ref={challengeSlotRef} className={styles.challengeSlot} />
      {canManageParticipants ? (
        <dialog
          ref={managementRef}
          className={styles.managementDialog}
          aria-labelledby="participant-management-title"
          onKeyDown={trapDialogFocus}
          onCancel={(event) => {
            if (removing || recovering) event.preventDefault();
          }}
          onClose={() => {
            setManagementOpen(false);
            setRemoval(null);
            setRecoveryParticipant(null);
            setRecoveryLink(null);
            infoRef.current?.querySelector('button')?.focus();
          }}
        >
          <div className={styles.dialogHeader}>
            <div className={styles.dialogHeading}>
              <span className={styles.dialogIcon} aria-hidden="true">
                <UserRoundCog size={20} strokeWidth={2.1} />
              </span>
              <div>
                <p className={styles.dialogEyebrow}>
                  {t('liveSession.sessionControls')}
                </p>
                <h2 id="participant-management-title">{manageLabel}</h2>
              </div>
            </div>
            <button
              type="button"
              className={styles.dialogClose}
              aria-label={closeDialogLabel}
              disabled={removing || recovering}
              onClick={() => setManagementOpen(false)}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className={styles.dialogBody}>
            <div className={styles.dialogNotice}>
              <Info size={18} aria-hidden="true" />
              <div>
                <p>
                  {t('liveSession.goingOfflineDoesNotRemoveA')}
                </p>
                <p>
                  {t('liveSession.otherEnginesSupportFutureChallengesOnly')}
                </p>
              </div>
            </div>
            {managementError ? (
              <p className={styles.dialogError} role="alert">
                {managementError}
              </p>
            ) : null}
            {!management ? (
              <p className={styles.dialogStatus} role="status">
                {t('liveSession.presenceUnavailable')}
              </p>
            ) : (
              <>
                <div className={styles.listHeading}>
                  <h3>{t('liveSession.participants')}</h3>
                  <span>{management.participants.length}</span>
                </div>
                <ul className={styles.managementList}>
                  {management.participants.map((participant) => (
                    <li key={participant.id}>
                      <div className={styles.participantIdentity}>
                        <span className={styles.participantAvatar} aria-hidden="true">
                          {participant.name?.trim()?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                        <div>
                          <strong>{participant.name}</strong>
                          <span className={styles.participantStatus}>
                            {
                              {
                                connected: t('liveSession.connected'),
                                offline: t('liveSession.offline'),
                                removed: t('liveSession.removed'),
                                unavailable: t('liveSession.presenceUnavailable'),
                              }[participant.presence]
                            }
                            {participant.removed_from_future && participant.presence !== 'removed'
                              ? t('liveSession.removedFromFutureChallenges')
                              : ''}
                          </span>
                        </div>
                      </div>
                      {participant.presence !== 'removed' ? (
                        <div className={styles.managementActions}>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={removing || recovering}
                            onClick={() => {
                              setRecoveryParticipant(participant);
                              setRecoveryLink(null);
                              setRemoval(null);
                              setManagementError('');
                            }}
                          >
                            {t('liveSession.restoreAccess')}
                          </Button>
                          {management.can_remove_current ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={removing}
                              onClick={() =>
                                setRemoval({ participant, scope: 'current_and_future' })
                              }
                            >
                              {t('liveSession.removeAndReassign')}
                            </Button>
                          ) : null}
                          {!participant.removed_from_future ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={removing}
                              onClick={() => setRemoval({ participant, scope: 'future' })}
                            >
                              {t('liveSession.futureChallengesOnly')}
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {recoveryParticipant ? (
              <div
                className={styles.confirmRemoval}
                role="group"
                aria-label={t('liveSession.restoreParticipantAccess')}
              >
                <h3>
                  {recoveryParticipant.name} — #{recoveryParticipant.id}
                </h3>
                <p>
                  {t('liveSession.verifyThisParticipantSIdentityIn')}
                </p>
                {recoveryLink ? <RecoveryLinkDisplay {...recoveryLink} /> : null}
                <div className={styles.inlineActions}>
                  <Button variant="primary" size="sm" disabled={recovering} onClick={restoreAccess}>
                    {recovering
                      ? t('liveSession.generating')
                      : recoveryLink
                        ? t('liveSession.replaceLink')
                        : t('liveSession.identityVerifiedGenerateLink')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={recovering}
                    onClick={() => {
                      setRecoveryParticipant(null);
                      setRecoveryLink(null);
                    }}
                  >
                    {t('liveSession.closeRecovery')}
                  </Button>
                </div>
              </div>
            ) : null}
            {removal ? (
              <div
                className={styles.confirmRemoval}
                role="group"
                aria-label={t('liveSession.confirmRemoval')}
              >
                <p>
                  {removal.scope === 'future'
                    ? t('liveSession.removeNameFromFutureChallengesTheir', { name: removal.participant.name })
                    : t('liveSession.removeNameNowAndFromFuture', { name: removal.participant.name })}
                </p>
                <div className={styles.inlineActions}>
                  <Button variant="primary" size="sm" disabled={removing} onClick={confirmRemoval}>
                    {removing
                      ? t('liveSession.removing')
                      : t('liveSession.confirmRemoval')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={removing}
                    onClick={() => setRemoval(null)}
                  >
                    {t('liveSession.cancel')}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
          <div className={styles.dialogFooter}>
            <Button
              variant="secondary"
              size="sm"
              disabled={removing || recovering}
              onClick={() => setManagementOpen(false)}
            >
              {closeLabel}
            </Button>
          </div>
        </dialog>
      ) : null}
      {canManageParticipants ? (
        <dialog
          ref={contextRef}
          className={styles.managementDialog}
          aria-labelledby="session-context-title"
          onKeyDown={trapDialogFocus}
          onCancel={(event) => {
            if (contextSaving) event.preventDefault();
          }}
          onClose={() => {
            setContextOpen(false);
            infoRef.current?.querySelector('button')?.focus();
          }}
        >
          <div className={styles.dialogHeader}>
            <div className={styles.dialogHeading}>
              <span className={styles.dialogIcon} aria-hidden="true">
                <Settings2 size={20} strokeWidth={2.1} />
              </span>
              <div>
                <p className={styles.dialogEyebrow}>
                  {t('liveSession.sessionSettings')}
                </p>
                <h2 id="session-context-title">
                  {t('liveSession.editSessionInfo')}
                </h2>
              </div>
            </div>
            <button
              type="button"
              className={styles.dialogClose}
              aria-label={closeDialogLabel}
              disabled={contextSaving}
              onClick={() => setContextOpen(false)}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <form onSubmit={saveContext} className={styles.contextForm}>
            <div className={styles.dialogBody}>
              <label className={styles.contextField}>
                <span>{t('liveSession.expectedParticipants')}</span>
                <input
                  type="number"
                  min="1"
                  max="2147483647"
                  step="1"
                  inputMode="numeric"
                  placeholder={t('liveSession.eG12')}
                  value={contextDraft.expected_participant_count}
                  onChange={(event) =>
                    setContextDraft((draft) => ({
                      ...draft,
                      expected_participant_count: event.target.value,
                    }))
                  }
                />
              </label>
              <fieldset className={styles.contextObjectives}>
                <legend>{t('liveSession.sessionObjectives')}</legend>
                <div className={styles.contextObjectiveOptions}>
                  {Object.entries(objectiveLabels).map(([key, label]) => {
                    const checked = parseObjectiveKeys(contextDraft.objective).includes(key);
                    return (
                      <label key={key}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            const current = parseObjectiveKeys(contextDraft.objective);
                            const next = event.target.checked
                              ? [...current, key]
                              : current.filter((item) => item !== key);
                            setContextDraft((draft) => ({
                              ...draft,
                              objective: objectiveKeys
                                .filter((item) => next.includes(item))
                                .join(','),
                            }));
                          }}
                        />
                        <span>{label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <div className={styles.contextNote}>
                <Info size={17} aria-hidden="true" />
                <p>
                  {t('liveSession.theseDetailsProvideContextOnlyThey')}
                </p>
              </div>
              {contextError ? (
                <p className={styles.dialogError} role="alert">
                  {contextError}
                </p>
              ) : null}
            </div>
            <div className={styles.dialogFooter}>
              <Button type="submit" variant="primary" size="sm" disabled={contextSaving}>
                {contextSaving
                  ? t('liveSession.saving')
                  : t('liveSession.save')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={contextSaving}
                onClick={() => setContextOpen(false)}
              >
                {closeLabel}
              </Button>
            </div>
          </form>
        </dialog>
      ) : null}
    </section>
  );
}
