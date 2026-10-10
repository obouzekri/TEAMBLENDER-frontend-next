'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Info, Users } from 'lucide-react';
import { Button } from '@/components/ui';
import useI18n from '@/lib/i18n/useI18n';
import { getApiUrl } from '@/lib/config';
import { getAuthHeaders } from '@/lib/auth';
import styles from './SessionLiveHeader.module.css';

function resolveChallengeLabel(challenge, isCurrent, currentLabel) {
  const name = String(challenge?.name || challenge?.title || challenge?.engine_key || '').trim();
  if (!name) return isCurrent ? currentLabel : '';
  return name;
}

function trapDialogFocus(event) {
  if (event.key !== 'Tab') return;
  const controls = [...event.currentTarget.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [href]')];
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
  const isEn = locale === 'en';
  const [infoOpen, setInfoOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState(null);
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
  const contextRef = useRef(null);
  const [contextOpen, setContextOpen] = useState(false);
  const [contextDraft, setContextDraft] = useState({ expected_participant_count: '', objective: '' });
  const [contextError, setContextError] = useState('');
  const [contextSaving, setContextSaving] = useState(false);
  const [savedContext, setSavedContext] = useState(null);
  const manageLabel = isEn ? 'Manage participants' : 'Gérer les participants';
  const closeLabel = isEn ? 'Close' : 'Fermer';
  const objectiveLabels = {
    cohesion: isEn ? 'Team cohesion' : 'Cohésion',
    communication: isEn ? 'Communication' : 'Communication',
    collaboration: isEn ? 'Collaboration' : 'Collaboration',
    leadership: isEn ? 'Leadership' : 'Leadership',
    'resolution-problemes': isEn ? 'Problem solving' : 'Résolution de problèmes',
    creativite: isEn ? 'Creativity' : 'Créativité',
    'intelligence-collective': isEn ? 'Collective intelligence' : 'Intelligence collective',
  };
  const displayedObjective = savedContext?.objective ?? sessionObjective;
  const displayedExpectedCount = savedContext ? savedContext.expected_participant_count : expectedParticipantCount;

  function openContextEditor() {
    setInfoOpen(false);
    if (onEditSessionInfo) { onEditSessionInfo(); return; }
    setContextDraft({ expected_participant_count: displayedExpectedCount ?? '', objective: displayedObjective || '' });
    setContextError('');
    setContextOpen(true);
  }

  useEffect(() => {
    if (contextOpen) contextRef.current?.showModal();
    else contextRef.current?.close();
  }, [contextOpen]);

  useEffect(() => { setSavedContext(null); }, [sessionId, expectedParticipantCount, sessionObjective]);

  async function saveContext(event) {
    event.preventDefault();
    const expected = contextDraft.expected_participant_count === '' ? null : Number(contextDraft.expected_participant_count);
    if (expected != null && (!Number.isInteger(expected) || expected < 1 || expected > 2147483647)) {
      setContextError(isEn ? 'Expected count must be a positive integer.' : 'Le nombre attendu doit être un entier positif.');
      return;
    }
    setContextSaving(true);
    setContextError('');
    try {
      const fields = { expected_participant_count: expected, objective: contextDraft.objective || null };
      const res = await fetch(getApiUrl(`/sessions/${encodeURIComponent(sessionId)}`), {
        method: 'PUT', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' }, credentials: 'include',
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
    const res = await fetch(getApiUrl(`/sessions/${encodeURIComponent(sessionId)}/participant-management`), { headers: getAuthHeaders(), credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `${isEn ? 'Error' : 'Erreur'} ${res.status}`);
    setManagement(data);
  }

  useEffect(() => {
    if (!canManageParticipants || !sessionId) return undefined;
    let cancelled = false;
    async function refresh() {
      try {
        const res = await fetch(getApiUrl(`/sessions/${encodeURIComponent(sessionId)}/participant-management`), { headers: getAuthHeaders(), credentials: 'include' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
        if (!cancelled) { setManagement(data); setManagementError(''); }
      } catch (error) {
        if (!cancelled) { setManagement(null); setManagementError(error.message); }
      }
    }
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => { cancelled = true; clearInterval(timer); };
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
      const res = await fetch(getApiUrl(`/sessions/${encodeURIComponent(sessionId)}/participant-management/${encodeURIComponent(removal.participant.id)}/remove`), {
        method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ scope: removal.scope, active_challenge_id: management.active_challenge_id }),
      });
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

  const resolvedSessionName = String(sessionName || '').trim() || sessionId || t('sessionLive.sessionFallbackName');
  const resolvedSessionCode = String(sessionCode || sessionId || '').trim();
  const resolvedActiveChallengeName = String(activeChallengeName || '').trim() || t('sessionLive.noActiveChallengeTitle');
  const presenceAvailable = management?.participants?.every((participant) => participant.presence !== 'unavailable');
  const resolvedParticipantCount = canManageParticipants
    ? (presenceAvailable ? management.participants.filter((participant) => participant.presence === 'connected').length : null)
    : (Number.isFinite(Number(participantCount)) ? Number(participantCount) : 0);
  const resolvedExpectedCount = displayedExpectedCount != null && Number.isFinite(Number(displayedExpectedCount))
    ? Number(displayedExpectedCount) : null;
  const orderedChallenges = Array.isArray(challenges) ? challenges : [];
  const sessionInfoLabel = isEn ? 'Session info' : 'Infos de session';
  const sessionCodeLabel = isEn ? 'Session code' : 'Code de la session';
  const copyLabel = isEn ? 'Copy' : 'Copier';
  const copiedLabel = isEn ? 'Copied' : 'Copié';
  const participantSummaryLabel = canManageParticipants
    ? (isEn ? 'Connected / expected participants' : 'Participants connectés / attendus')
    : (isEn ? 'Assigned / expected participants' : 'Participants inscrits / attendus');
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
          {resolvedParticipantCount ?? '—'} / {resolvedExpectedCount ?? '—'}
        </strong>
        <p>{isEn ? 'Registered' : 'Inscrits'} : {Number.isFinite(Number(participantCount)) ? Number(participantCount) : '—'}</p>
        {resolvedExpectedCount == null ? <p>{isEn ? 'Expected attendance not specified' : 'Nombre attendu non précisé'}</p> : null}
        {canManageParticipants ? <Button variant="secondary" size="sm" onClick={() => { setInfoOpen(false); setManagementOpen(true); }}>{manageLabel}</Button> : null}
      </div>
      {displayedObjective ? <div className={styles.popoverSection}><p className={styles.popoverLabel}>{isEn ? 'Objective' : 'Objectif'}</p><p>{objectiveLabels[displayedObjective] || displayedObjective}</p></div> : null}
      {canManageParticipants ? <Button variant="secondary" size="sm" onClick={openContextEditor}>{isEn ? 'Edit session info' : 'Modifier les infos'}</Button> : null}
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
      <div className={styles.topRow}>
        <div className={styles.details}>
          <div className={styles.titleRow}>
            <strong className={styles.sessionName} title={resolvedSessionName}>{resolvedSessionName}</strong>
            <div ref={infoRef} className={styles.infoWrap}>
              <button
                type="button"
                className={styles.infoButton}
                aria-expanded={infoOpen}
                aria-label={sessionInfoLabel}
                onClick={() => setInfoOpen((current) => !current)}
              >
                <Info size={14} strokeWidth={2.2} aria-hidden="true" />
              </button>
              <span className={styles.infoTooltip} role="tooltip">{sessionInfoLabel}</span>
              {infoPopover && typeof document !== 'undefined' ? createPortal(infoPopover, document.body) : null}
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
              {advancing ? t('sessionLive.inProgress') : (advanceLabel || t('sessionLive.moveToNextChallenge'))}
            </Button>
          </div>
        ) : null}
      </div>

      <div ref={challengeSlotRef} className={styles.challengeSlot} />
      {canManageParticipants ? (
        <dialog ref={managementRef} className={styles.managementDialog} aria-labelledby="participant-management-title"
          onKeyDown={trapDialogFocus}
          onCancel={(event) => { if (removing) event.preventDefault(); }}
          onClose={() => { setManagementOpen(false); setRemoval(null); infoRef.current?.querySelector('button')?.focus(); }}>
          <h2 id="participant-management-title">{manageLabel}</h2>
          <p>{isEn
            ? 'Going offline does not remove a participant. Current removal redistributes unfinished puzzle pieces or words, preserving placed work. Other engines support future challenges only: finish the current challenge or use its own explicit reset controls.'
            : 'Une déconnexion ne retire pas un participant. Le retrait actuel redistribue les pièces ou mots inachevés sans effacer le travail placé. Pour les autres moteurs, seul le retrait des prochains challenges est disponible : terminez le challenge actuel ou utilisez ses propres commandes de réinitialisation.'}</p>
          <p>{isEn ? 'Removal applies to this session only and is not undone by reconnecting. Completed challenges and saved results remain unchanged.' : 'Le retrait concerne cette session uniquement et une reconnexion ne l’annule pas. Les challenges terminés et les résultats enregistrés restent inchangés.'}</p>
          {managementError ? <p role="alert">{managementError}</p> : null}
          {!management ? <p role="status">{isEn ? 'Presence unavailable' : 'Présence indisponible'}</p> : (
            <ul className={styles.managementList}>
              {management.participants.map((participant) => (
                <li key={participant.id}>
                  <div><strong>{participant.name}</strong><span>{({
                    connected: isEn ? 'Connected' : 'Connecté', offline: isEn ? 'Offline' : 'Hors ligne',
                    removed: isEn ? 'Removed' : 'Retiré', unavailable: isEn ? 'Presence unavailable' : 'Présence indisponible',
                  })[participant.presence]}{participant.removed_from_future && participant.presence !== 'removed' ? (isEn ? ' · Removed from future challenges' : ' · Retiré des prochains challenges') : ''}</span></div>
                  {participant.presence !== 'removed' ? <div className={styles.managementActions}>
                    {management.can_remove_current ? <Button size="sm" variant="secondary" disabled={removing} onClick={() => setRemoval({ participant, scope: 'current_and_future' })}>{isEn ? 'Remove and reassign' : 'Retirer et redistribuer'}</Button> : null}
                    {!participant.removed_from_future ? <Button size="sm" variant="secondary" disabled={removing} onClick={() => setRemoval({ participant, scope: 'future' })}>{isEn ? 'Future challenges only' : 'Prochains challenges uniquement'}</Button> : null}
                  </div> : null}
                </li>
              ))}
            </ul>
          )}
          {removal ? <div className={styles.confirmRemoval} role="group" aria-label={isEn ? 'Confirm removal' : 'Confirmer le retrait'}>
            <p>{removal.scope === 'future'
              ? (isEn ? `Remove ${removal.participant.name} from future challenges? Their current assignment stays unchanged.` : `Retirer ${removal.participant.name} des prochains challenges ? Son attribution actuelle reste inchangée.`)
              : (isEn ? `Remove ${removal.participant.name} now and from future challenges? Unfinished items will be redistributed; this cannot be undone by reconnecting.` : `Retirer ${removal.participant.name} maintenant et des prochains challenges ? Les éléments inachevés seront redistribués ; une reconnexion ne pourra pas annuler ce retrait.`)}</p>
            <Button variant="primary" size="sm" disabled={removing} onClick={confirmRemoval}>{removing ? (isEn ? 'Removing…' : 'Retrait…') : (isEn ? 'Confirm removal' : 'Confirmer le retrait')}</Button>
            <Button variant="secondary" size="sm" disabled={removing} onClick={() => setRemoval(null)}>{isEn ? 'Cancel' : 'Annuler'}</Button>
          </div> : null}
          <Button variant="secondary" size="sm" disabled={removing} onClick={() => setManagementOpen(false)}>{closeLabel}</Button>
        </dialog>
      ) : null}
      {canManageParticipants ? <dialog ref={contextRef} className={styles.managementDialog} aria-labelledby="session-context-title"
        onKeyDown={trapDialogFocus}
        onCancel={(event) => { if (contextSaving) event.preventDefault(); }}
        onClose={() => { setContextOpen(false); infoRef.current?.querySelector('button')?.focus(); }}>
        <h2 id="session-context-title">{isEn ? 'Edit session info' : 'Modifier les infos'}</h2>
        <form onSubmit={saveContext} className={styles.contextForm}>
          <label>{isEn ? 'Expected participants' : 'Participants attendus'}
            <input type="number" min="1" max="2147483647" step="1" value={contextDraft.expected_participant_count}
              onChange={(event) => setContextDraft((draft) => ({ ...draft, expected_participant_count: event.target.value }))} />
          </label>
          <label>{isEn ? 'Objective' : 'Objectif'}
            <select value={contextDraft.objective} onChange={(event) => setContextDraft((draft) => ({ ...draft, objective: event.target.value }))}>
              <option value="">{isEn ? 'Not specified' : 'Non précisé'}</option>
              {Object.entries(objectiveLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <p>{isEn ? 'Session context only: this does not change game assignments or restart the current challenge.' : 'Contexte de session uniquement : ceci ne modifie pas les attributions et ne redémarre pas le challenge actuel.'}</p>
          {contextError ? <p role="alert">{contextError}</p> : null}
          <div className={styles.managementActions}>
            <Button type="submit" variant="primary" size="sm" disabled={contextSaving}>{contextSaving ? (isEn ? 'Saving…' : 'Enregistrement…') : (isEn ? 'Save' : 'Enregistrer')}</Button>
            <Button type="button" variant="secondary" size="sm" disabled={contextSaving} onClick={() => setContextOpen(false)}>{closeLabel}</Button>
          </div>
        </form>
      </dialog> : null}
    </section>
  );
}
