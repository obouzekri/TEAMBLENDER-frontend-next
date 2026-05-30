'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import useChallengeChat from '@/lib/challenges/useChallengeChat';
import { DEFAULT_CHALLENGE_QUICK_MESSAGES } from '@/lib/challenges/chat-presets';
import { resolveChallengeRules } from '@/lib/challenges/rules';
import ChallengeTimerCard from '../ChallengeTimerCard';
import ChallengeChatCard from '../ChallengeChatCard';
import ChallengeRulesPanel from '../ChallengeRulesPanel';
import styles from './VraiOuMensonge.module.css';

function phaseLabel(phase) {
  const labels = {
    waiting_start: 'En attente',
    selecting_statement: 'Choix de l affirmation',
    voting_open: 'Votes ouverts',
    reveal_pending: 'Révélation',
    round_result: 'Résultat du tour',
    next_turn: 'Tour suivant',
    finished: 'Partie terminée',
    paused_poseur_disconnect: 'Pause (poseur déconnecté)'
  };
  return labels[String(phase || '')] || 'Phase inconnue';
}

function formatSeconds(ms) {
  const raw = Number(ms || 0);
  const total = Number.isFinite(raw) ? Math.max(0, Math.ceil(raw / 1000)) : 0;
  return total;
}

function formatClock(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds || 0));
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function normalizeName(value) {
  return String(value || '').trim();
}

function isEmailLike(value) {
  return normalizeName(value).includes('@');
}

export default function VraiOuMensongeChallenge({ runtimePayload, socket, context, onChallengeCompleted }) {
  const [selectedStatementId, setSelectedStatementId] = useState('');
  const [revealTruth, setRevealTruth] = useState('vrai');
  const [nowMs, setNowMs] = useState(Date.now());
  const [clickedStatementId, setClickedStatementId] = useState('');
  const [resultPulse, setResultPulse] = useState(false);
  const audioRef = useRef(null);

  const {
    state,
    error,
    isFacilitator,
    emitEvent,
    participantId,
  } = useRealtimeChallenge({ runtimePayload, socket, context, onChallengeCompleted });

  const vom = state?.vom || {};
  const phase = String(vom?.phase || 'waiting_start');
  const hasChallengeStarted = phase !== 'waiting_start';
  const currentTurn = vom?.current_turn || null;
  const scores = vom?.scores || {};
  const ranking = Array.isArray(vom?.ranking) ? vom.ranking : [];
  const participantsOrder = Array.isArray(vom?.participants_order) ? vom.participants_order : [];
  const participantsMeta = Array.isArray(vom?.participants_meta) ? vom.participants_meta : [];
  const catalog = Array.isArray(vom?.catalog) ? vom.catalog : [];

  const me = String(participantId || context?.userId || '');
  const poserId = String(currentTurn?.poser_id || '');
  const isPoser = me && poserId && me === poserId;
  const chatEnabled = Boolean(socket);

  const displayName = useMemo(() => {
    const firstName = String(runtimePayload?.context?.firstName || runtimePayload?.context?.first_name || context?.firstName || context?.first_name || '').trim();
    const lastName = String(runtimePayload?.context?.lastName || runtimePayload?.context?.last_name || context?.lastName || context?.last_name || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) return fullName;
    const fromPayload = String(runtimePayload?.context?.displayName || '').trim();
    if (fromPayload && !isEmailLike(fromPayload)) return fromPayload;
    const fromContext = String(context?.displayName || '').trim();
    if (fromContext && !isEmailLike(fromContext)) return fromContext;
    return 'Participant';
  }, [runtimePayload, context, me]);

  const participantNameMap = useMemo(() => {
    const map = new Map();
    participantsMeta.forEach((item) => {
      const id = String(item?.participant_id || '');
      if (!id) return;
      const slot = Number(item?.slot || 0);
      const fallback = slot > 0 ? `Participant ${slot}` : 'Participant';
      const firstName = String(item?.first_name || item?.firstName || '').trim();
      const lastName = String(item?.last_name || item?.lastName || '').trim();
      const fullName = `${firstName} ${lastName}`.trim();
      const displayName = String(item?.display_name || '').trim();
      const safeDisplayName = displayName && !isEmailLike(displayName) ? displayName : '';
      map.set(id, fullName || safeDisplayName || fallback);
    });

    participantsOrder.forEach((id, index) => {
      if (!map.has(String(id))) {
        map.set(String(id), `Participant ${index + 1}`);
      }
    });
    return map;
  }, [participantsMeta, participantsOrder]);

  const orderedParticipantIds = useMemo(() => {
    if (participantsMeta.length > 0) {
      return [...participantsMeta]
        .sort((a, b) => Number(a?.slot || 999) - Number(b?.slot || 999))
        .map((item) => String(item?.participant_id || ''))
        .filter(Boolean);
    }
    return participantsOrder;
  }, [participantsMeta, participantsOrder]);

  function participantName(id) {
    const value = String(participantNameMap.get(String(id)) || '').trim();
    return value && !isEmailLike(value) ? value : 'Participant';
  }

  const {
    chatInput,
    setChatInput,
    chatMessages,
    submitChat,
    sendQuickChat,
  } = useChallengeChat({
    socket,
    emitEvent,
    author: displayName,
    enabled: chatEnabled,
    maxMessages: 80,
    maxLength: 240,
  });

  const usedByPoser = useMemo(() => {
    const byParticipant = vom?.used_statement_ids_by_participant || {};
    const ids = Array.isArray(byParticipant[poserId]) ? byParticipant[poserId] : [];
    return new Set(ids.map((value) => String(value)));
  }, [vom, poserId]);

  const myVote = String(currentTurn?.votes?.[me] || '');
  const rulesContent = useMemo(
    () => resolveChallengeRules(state?.config || runtimePayload?.config),
    [runtimePayload?.config, state?.config]
  );

  const remainingMs = useMemo(() => {
    const deadline = Number(vom?.phase_deadline_ms || 0);
    const startedAt = Number(vom?.phase_started_at_ms || 0);
    const timing = vom?.timing || {};
    const fallbackDuration = Number(
      phase === 'selecting_statement'
        ? timing.selecting_ms
        : phase === 'voting_open'
          ? timing.voting_ms
          : phase === 'reveal_pending'
            ? timing.reveal_ms
            : phase === 'round_result'
              ? timing.round_result_ms
              : phase === 'next_turn'
                ? timing.next_turn_ms
                : 0
    ) || 0;

    if (deadline > 0) {
      return Math.max(0, deadline - nowMs);
    }
    if (startedAt > 0 && fallbackDuration > 0) {
      return Math.max(0, (startedAt + fallbackDuration) - nowMs);
    }
    return fallbackDuration;
  }, [nowMs, phase, vom?.phase_deadline_ms, vom?.phase_started_at_ms, vom?.timing]);

  const phaseDurationSeconds = useMemo(() => {
    const startedAt = Number(vom?.phase_started_at_ms || 0);
    const deadline = Number(vom?.phase_deadline_ms || 0);
    if (startedAt > 0 && deadline > startedAt) {
      return formatSeconds(deadline - startedAt);
    }
    const timing = vom?.timing || {};
    if (phase === 'selecting_statement') return formatSeconds(timing.selecting_ms || 30_000);
    if (phase === 'voting_open') return formatSeconds(timing.voting_ms || 30_000);
    if (phase === 'reveal_pending') return formatSeconds(timing.reveal_ms || 5_000);
    if (phase === 'round_result') return formatSeconds(timing.round_result_ms || 5_000);
    if (phase === 'next_turn') return formatSeconds(timing.next_turn_ms || 0);
    return 1;
  }, [phase, vom?.phase_deadline_ms, vom?.phase_started_at_ms, vom?.timing]);

  const remainingSecondsForCard = useMemo(() => {
    const remaining = formatSeconds(remainingMs);
    return remaining;
  }, [phase, phaseDurationSeconds, remainingMs]);

  const myRoundVote = useMemo(() => {
    const votes = Array.isArray(currentTurn?.result?.votes) ? currentTurn.result.votes : [];
    return votes.find((item) => String(item?.participant_id || '') === me) || null;
  }, [currentTurn?.result?.votes, me]);

  const myScore = Number(scores[me] || 0);

  const poseurRoundPoints = Number(currentTurn?.result?.poser_points || 0);
  const totalCycles = Math.max(1, Number(vom?.computed_cycles || vom?.rounds_per_participant || 3));
  const currentCycle = Math.max(1, Math.min(totalCycles, Number(currentTurn?.passage_number || 1)));

  function playLightTone(kind) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioRef.current) audioRef.current = new Ctx();
      const ctx = audioRef.current;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.value = kind === 'success' ? 720 : kind === 'error' ? 240 : 460;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.13);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.14);
    } catch {
      // No-op: le son reste optionnel et ne doit jamais bloquer l interaction.
    }
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (phase === 'round_result') {
      setResultPulse(true);
      const t = window.setTimeout(() => setResultPulse(false), 1200);
      if (isPoser) {
        playLightTone(poseurRoundPoints > 0 ? 'success' : 'default');
      } else if (myRoundVote?.status === 'correct') {
        playLightTone('success');
      } else if (myRoundVote?.status === 'incorrect') {
        playLightTone('error');
      } else {
        playLightTone('default');
      }
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [phase, myRoundVote?.status, isPoser, poseurRoundPoints]);

  function startChallenge() {
    emitEvent('vom.start', {});
  }

  function confirmStatement() {
    if (!selectedStatementId) return;
    playLightTone('default');
    emitEvent('vom.select_statement', { statement_id: selectedStatementId });
  }

  function vote(v) {
    playLightTone('default');
    emitEvent('vom.vote', { vote: v });
  }

  function reveal() {
    emitEvent('vom.reveal', { truth: revealTruth });
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerLine}>
          <span className={styles.headerTitle}>Vrai ou Mensonge</span>
          <span className={styles.headerSeparator}>-</span>
          <span className={styles.headerDescription}>DEVINEZ LE VRAI DU FAUX ET DÉCOUVREZ VOTRE ÉQUIPE AUTREMENT</span>
          {phase !== 'waiting_start' ? (
            <>
              <span className={styles.headerSeparator}>-</span>
              <span className={styles.headerDescription}>Live : {phaseLabel(phase)}</span>
            </>
          ) : null}
        </div>
      </header>

      {error ? <p className={styles.errorBanner}>{error}</p> : null}

      <div className={styles.layout}>
        <div className={styles.mainColumn}>

        {!hasChallengeStarted ? (
          <section className={styles.card}>
            <ChallengeRulesPanel
              isStarted={false}
              isFacilitator={isFacilitator}
              challengeName="Vrai ou Mensonge"
              objective={rulesContent.objective}
              facilitatorRules={rulesContent.facilitator}
              participantRules={rulesContent.participant}
              footnote={rulesContent.footnote}
              onStart={isFacilitator ? startChallenge : null}
            />
          </section>
        ) : null}

        {phase === 'selecting_statement' ? (
          <section className={styles.card}>
            <h2>Sélection d'affirmation</h2>
            <p>Poseur actuel: <strong>{participantName(poserId) || '-'}</strong></p>
            <p className={styles.instruction}>Choisissez une affirmation.</p>
            <div className={styles.participantsRow}>
              {orderedParticipantIds.map((id) => (
                <span key={id} className={`${styles.participantChip}${id === poserId ? ` ${styles.participantChipPoser}` : ''}`}>
                  {participantName(id)}{id === poserId ? ' (poseur)' : ''}
                </span>
              ))}
            </div>
            {isPoser ? (
              <>
                <div className={styles.statementGrid}>
                  {catalog.map((statement) => {
                    const disabled = usedByPoser.has(String(statement.id));
                    const selected = selectedStatementId === String(statement.id);
                    return (
                      <button
                        key={statement.id}
                        type="button"
                        className={`${styles.statementBtn}${selected ? ` ${styles.statementBtnSelected}` : ''}${clickedStatementId === String(statement.id) ? ` ${styles.statementBtnClicked}` : ''}`}
                        disabled={disabled}
                        onClick={() => {
                          setSelectedStatementId(String(statement.id));
                          setClickedStatementId(String(statement.id));
                          playLightTone('default');
                          window.setTimeout(() => setClickedStatementId(''), 180);
                        }}
                      >
                        <span className={styles.category}>{statement.category}</span>
                        <span>{statement.text}</span>
                        {selected ? <span className={styles.selectedMark}>Selectionnee</span> : null}
                        {disabled ? <small>Déjà utilisée par vous</small> : null}
                      </button>
                    );
                  })}
                </div>
                <div className={styles.stickyCtaWrap}>
                  <button
                    type="button"
                    className={`${styles.primaryBtn} ${styles.stickyCtaBtn}`}
                    disabled={!selectedStatementId}
                    onClick={confirmStatement}
                  >
                    Confirmer ma sélection
                  </button>
                </div>
              </>
            ) : (
              <p className={styles.helper}>Le poseur choisit une affirmation dans le catalogue.</p>
            )}
          </section>
        ) : null}

        {phase === 'voting_open' ? (
          <section className={styles.card}>
            <h2>Votes ouverts</h2>
            <p><strong>{participantName(poserId)}</strong> affirme : "{currentTurn?.statement_text || '-'}"</p>
            {!isFacilitator && !isPoser ? (
              <div className={styles.voteActions}>
                <button
                  type="button"
                  className={`${styles.voteTrue}${myVote === 'vrai' ? ` ${styles.voteActive}` : ''}`}
                  onClick={() => vote('vrai')}
                >
                  Vrai
                </button>
                <button
                  type="button"
                  className={`${styles.voteFalse}${myVote === 'mensonge' ? ` ${styles.voteActive}` : ''}`}
                  onClick={() => vote('mensonge')}
                >
                  Mensonge
                </button>
                <p className={styles.helper}>Votre vote actuel: {myVote || 'absent'}</p>
              </div>
            ) : isFacilitator ? (
              <p className={styles.helper}>Le facilitateur observe le tour sans voter.</p>
            ) : (
              <p className={styles.helper}>Vous êtes poseur, vous ne votez pas.</p>
            )}
          </section>
        ) : null}

        {phase === 'reveal_pending' ? (
          <section className={styles.card}>
            <h2>Révélation</h2>
            <p>Phrase: {currentTurn?.statement_text || '-'}</p>
            {isPoser ? (
              <>
                <div className={styles.voteActions}>
                  <button
                    type="button"
                    className={`${styles.voteTrue}${revealTruth === 'vrai' ? ` ${styles.voteActive}` : ''}`}
                    onClick={() => setRevealTruth('vrai')}
                  >
                    Vrai
                  </button>
                  <button
                    type="button"
                    className={`${styles.voteFalse}${revealTruth === 'mensonge' ? ` ${styles.voteActive}` : ''}`}
                    onClick={() => setRevealTruth('mensonge')}
                  >
                    Mensonge
                  </button>
                </div>
                <p className={styles.helper}>Vérité choisie: {revealTruth}</p>
                <button type="button" className={styles.primaryBtn} onClick={reveal}>Révéler (irréversible)</button>
              </>
            ) : (
              <p className={styles.helper}>En attente de la révélation du poseur.</p>
            )}
          </section>
        ) : null}

        {phase === 'round_result' ? (
          <section className={styles.card}>
            <h2>Résultat du tour</h2>
            <div className={`${styles.wowResult}${resultPulse ? ` ${styles.wowResultPulse}` : ''}`}>
              <div>
                <strong className={styles.wowTitle}>Feedback instantané</strong>
                {!isPoser ? (
                  <p className={styles.wowText}>
                    {myRoundVote?.status === 'correct' ? 'Bonne réponse: +1 point' : myRoundVote?.status === 'incorrect' ? 'Mauvaise réponse: 0 point' : 'Aucune réponse: 0 point'}
                    {' '}| Bonne réponse: <strong>{String(currentTurn?.revealed_truth || '-')}</strong>
                  </p>
                ) : (
                  <p className={styles.wowText}>
                    Vous étiez poseur: <strong>+{poseurRoundPoints}</strong> point{poseurRoundPoints > 1 ? 's' : ''} (selon les bonnes réponses)
                  </p>
                )}
              </div>
            </div>

            <div className={styles.mainScoreCard}>
              <span className={styles.mainScoreLabel}>Mon score</span>
              <span className={styles.mainScoreValue}>{myScore}</span>
              <span className={styles.mainScoreUnit}>points</span>
            </div>

            <p>Classement en transition ({formatClock(formatSeconds(remainingMs))}) avant le prochain tour.</p>
            <div className={styles.resultList}>
              {(currentTurn?.result?.votes || []).map((item) => (
                <div key={item.participant_id} className={styles.resultRow}>
                  <span>{participantName(item.participant_id)}</span>
                  <span>{item.status}</span>
                  <span>+{item.points}</span>
                </div>
              ))}
            </div>
            <h3>Classement</h3>
            <div className={styles.resultList}>
              {orderedParticipantIds.map((participant) => (
                <div key={participant} className={styles.resultRow}>
                  <span>{participantName(participant)} - {Number(scores[participant] || 0)} pts</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {phase === 'next_turn' ? (
          <section className={styles.card}>
            <h2>Transition</h2>
            <p>Préparation du tour suivant...</p>
          </section>
        ) : null}

        {phase === 'paused_poseur_disconnect' ? (
          <section className={styles.card}>
            <h2>Pause temporaire</h2>
            <p>Le poseur est déconnecté. La partie reprend automatiquement à sa reconnexion.</p>
          </section>
        ) : null}

        {phase === 'finished' ? (
          <section className={styles.card} style={{ order: -1 }}>
            <h2>Débrief final</h2>
            <div className={`${styles.mainScoreCard} ${styles.finalWow}`}>
              <span className={styles.mainScoreLabel}>Votre score final</span>
              <span className={styles.mainScoreValue}>{myScore}</span>
              <span className={styles.mainScoreUnit}>points</span>
            </div>
            <div className={styles.resultList}>
              {ranking.map((entry) => (
                <div key={entry.participant_id} className={styles.resultRow}>
                  <span>#{entry.rank} {participantName(entry.participant_id)}</span>
                  <span>{entry.score} pts {entry.tie ? '(ex-aequo)' : ''}</span>
                </div>
              ))}
            </div>
            <p className={styles.helper}>Action de sortie: retour à l espace participant.</p>
            <a className={styles.primaryBtn} href={`/participant?sessionId=${encodeURIComponent(String(context?.sessionId || runtimePayload?.session_id || ''))}`}>
              Sortir du challenge
            </a>
          </section>
        ) : null}

        {phase === 'finished' && currentTurn?.result ? (
          <section className={styles.card}>
            <h2>Dernier état du jeu</h2>
            <p className={styles.wowText}>
              Affirmation: <strong>{currentTurn.result.statement_text || '-'}</strong>
            </p>
            <p className={styles.wowText}>
              Vérité révélée: <strong>{String(currentTurn.result.truth || '-')}</strong>
            </p>
            <div className={styles.resultList}>
              {(currentTurn.result.votes || []).map((item) => (
                <div key={`finished-${item.participant_id}`} className={styles.resultRow}>
                  <span>{participantName(item.participant_id)}</span>
                  <span>{item.status}</span>
                  <span>+{item.points}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
        </div>

        <aside className={styles.sideColumn}>
          <ChallengeRulesPanel
            isStarted={hasChallengeStarted}
            isFacilitator={isFacilitator}
            showPrestartCard={false}
            challengeName="Vrai ou Mensonge"
            objective={rulesContent.objective}
            facilitatorRules={rulesContent.facilitator}
            participantRules={rulesContent.participant}
            footnote={rulesContent.footnote}
          />

          <ChallengeTimerCard
            title="Chrono"
            remainingSeconds={remainingSecondsForCard}
            durationSeconds={Math.max(1, phaseDurationSeconds)}
            status={phase === 'voting_open' || phase === 'selecting_statement' || phase === 'reveal_pending' || phase === 'round_result' ? 'running' : 'idle'}
            isFacilitator={isFacilitator}
            waitingText=""
          />

          <ChallengeChatCard
            title="Chat"
            messages={chatMessages}
            currentAuthor={displayName}
            inputValue={chatInput}
            onInputChange={setChatInput}
            onSubmit={submitChat}
            quickMessages={DEFAULT_CHALLENGE_QUICK_MESSAGES}
            onQuickMessage={sendQuickChat}
            placeholder="Écrire un message"
            maxLength={240}
            disabled={!chatEnabled}
          />

          <section className={`${styles.card} ${styles.stateCard}`}>
            <h3>Classement</h3>
            <div className={styles.resultList}>
              {orderedParticipantIds.length === 0 ? <p className={styles.helper}>Aucun participant détecté.</p> : null}
              {orderedParticipantIds.map((participant) => (
                <div key={participant} className={styles.resultRow}>
                  <span>{participantName(participant)} - {Number(scores[participant] || 0)} pts</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
