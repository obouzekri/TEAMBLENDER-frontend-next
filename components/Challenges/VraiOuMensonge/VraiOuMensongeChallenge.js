'use client';

import React, { useEffect, useMemo, useState } from 'react';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import useChallengeChat from '@/lib/challenges/useChallengeChat';
import { DEFAULT_CHALLENGE_QUICK_MESSAGES } from '@/lib/challenges/chat-presets';
import ChallengeTimerCard from '../ChallengeTimerCard';
import ChallengeChatCard from '../ChallengeChatCard';
import styles from './VraiOuMensonge.module.css';

function phaseLabel(phase) {
  const labels = {
    waiting_start: 'Lobby',
    selecting_statement: 'Selection phrase',
    voting_open: 'Votes ouverts',
    reveal_pending: 'En attente de revelation',
    round_result: 'Resultat du tour',
    next_turn: 'Tour suivant',
    finished: 'Partie terminee',
    paused_poseur_disconnect: 'Pause (poseur deconnecte)'
  };
  return labels[String(phase || '')] || 'Phase inconnue';
}

function formatSeconds(ms) {
  const raw = Number(ms || 0);
  const total = Number.isFinite(raw) ? Math.max(0, Math.ceil(raw / 1000)) : 0;
  return total;
}

export default function VraiOuMensongeChallenge({ runtimePayload, socket, context, onChallengeCompleted }) {
  const [selectedStatementId, setSelectedStatementId] = useState('');
  const [revealTruth, setRevealTruth] = useState('vrai');
  const [nowMs, setNowMs] = useState(Date.now());

  const {
    state,
    error,
    isFacilitator,
    emitEvent,
    participantId,
  } = useRealtimeChallenge({ runtimePayload, socket, context, onChallengeCompleted });

  const vom = state?.vom || {};
  const phase = String(vom?.phase || 'waiting_start');
  const currentTurn = vom?.current_turn || null;
  const scores = vom?.scores || {};
  const ranking = Array.isArray(vom?.ranking) ? vom.ranking : [];
  const participantsOrder = Array.isArray(vom?.participants_order) ? vom.participants_order : [];
  const catalog = Array.isArray(vom?.catalog) ? vom.catalog : [];
  const roundHistory = Array.isArray(vom?.round_history) ? vom.round_history : [];

  const me = String(participantId || context?.userId || '');
  const poserId = String(currentTurn?.poser_id || '');
  const isPoser = me && poserId && me === poserId;
  const chatEnabled = state?.config?.chat?.enabled !== false && Boolean(socket);

  const displayName = useMemo(() => {
    const fromPayload = String(runtimePayload?.context?.displayName || '').trim();
    if (fromPayload) return fromPayload;
    const fromContext = String(context?.displayName || '').trim();
    if (fromContext) return fromContext;
    return `participant-${me || 'unknown'}`;
  }, [runtimePayload, context, me]);

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

  const remainingMs = useMemo(() => {
    const deadline = Number(vom?.phase_deadline_ms || 0);
    if (!deadline) return 0;
    return Math.max(0, deadline - nowMs);
  }, [vom?.phase_deadline_ms, nowMs]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  function startChallenge() {
    emitEvent('vom.start', {});
  }

  function confirmStatement() {
    if (!selectedStatementId) return;
    emitEvent('vom.select_statement', { statement_id: selectedStatementId });
  }

  function vote(v) {
    emitEvent('vom.vote', { vote: v });
  }

  function reveal() {
    emitEvent('vom.reveal', { truth: revealTruth });
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <p className={styles.kicker}>Challenge collaboratif</p>
          <h1>Vrai ou Mensonge</h1>
          <p>Experience individuelle, rapide, orientee engagement collectif.</p>
        </div>
        <div className={styles.meta}>
          <span className={styles.badge}>{phaseLabel(phase)}</span>
          <span className={styles.badge}>Tour {Number(vom?.turn_index || 0) + 1}/{Number(vom?.total_turns || 0)}</span>
          <span className={styles.badge}>Temps restant: {formatSeconds(remainingMs)}s</span>
        </div>
      </header>

      {error ? <p className={styles.errorBanner}>{error}</p> : null}

      <div className={styles.layout}>
        <div className={styles.mainColumn}>

        {phase === 'waiting_start' ? (
          <section className={styles.card}>
            <h2>Lobby</h2>
            <p>Regle: 3 affirmations exactes par participant, ordre round-robin, vote individuel des non-poseurs.</p>
            <ol className={styles.orderList}>
              {participantsOrder.map((participant) => (
                <li key={participant}>{participant}</li>
              ))}
            </ol>
            {isFacilitator ? (
              <button type="button" className={styles.primaryBtn} onClick={startChallenge}>
                Demarrer le challenge
              </button>
            ) : (
              <p className={styles.helper}>En attente du facilitateur.</p>
            )}
          </section>
        ) : null}

        {phase === 'selecting_statement' ? (
          <section className={styles.card}>
            <h2>Selection d affirmation</h2>
            <p>Poseur actuel: <strong>{poserId || '-'}</strong></p>
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
                        className={`${styles.statementBtn}${selected ? ` ${styles.statementBtnSelected}` : ''}`}
                        disabled={disabled}
                        onClick={() => setSelectedStatementId(String(statement.id))}
                      >
                        <span className={styles.category}>{statement.category}</span>
                        <span>{statement.text}</span>
                        {disabled ? <small>Deja utilisee par vous</small> : null}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  disabled={!selectedStatementId}
                  onClick={confirmStatement}
                >
                  Confirmer la phrase
                </button>
              </>
            ) : (
              <p className={styles.helper}>Le poseur choisit une phrase du catalogue fixe.</p>
            )}
          </section>
        ) : null}

        {phase === 'voting_open' ? (
          <section className={styles.card}>
            <h2>Votes ouverts</h2>
            <p><strong>{poserId}</strong> affirme: {currentTurn?.statement_text || '-'}</p>
            {!isPoser ? (
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
            ) : (
              <p className={styles.helper}>Vous etes poseur, vous ne votez pas.</p>
            )}
          </section>
        ) : null}

        {phase === 'reveal_pending' ? (
          <section className={styles.card}>
            <h2>Revelation</h2>
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
                <p className={styles.helper}>Verite choisie: {revealTruth}</p>
                <button type="button" className={styles.primaryBtn} onClick={reveal}>Reveler (irreversible)</button>
              </>
            ) : (
              <p className={styles.helper}>En attente de la revelation du poseur.</p>
            )}
          </section>
        ) : null}

        {phase === 'round_result' ? (
          <section className={styles.card}>
            <h2>Resultat du tour</h2>
            <p>Verite: <strong>{String(currentTurn?.revealed_truth || '-')}</strong></p>
            <div className={styles.resultList}>
              {(currentTurn?.result?.votes || []).map((item) => (
                <div key={item.participant_id} className={styles.resultRow}>
                  <span>{item.participant_id}</span>
                  <span>{item.status}</span>
                  <span>+{item.points}</span>
                </div>
              ))}
            </div>
            <h3>Scores cumules</h3>
            <div className={styles.resultList}>
              {participantsOrder.map((participant) => (
                <div key={participant} className={styles.resultRow}>
                  <span>{participant}</span>
                  <span>{Number(scores[participant] || 0)} pts</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {phase === 'next_turn' ? (
          <section className={styles.card}>
            <h2>Transition</h2>
            <p>Preparation du tour suivant...</p>
          </section>
        ) : null}

        {phase === 'paused_poseur_disconnect' ? (
          <section className={styles.card}>
            <h2>Pause temporaire</h2>
            <p>Le poseur est deconnecte. La partie reprend automatiquement a sa reconnexion.</p>
          </section>
        ) : null}

        {phase === 'finished' ? (
          <section className={styles.card}>
            <h2>Classement final</h2>
            <div className={styles.resultList}>
              {ranking.map((entry) => (
                <div key={entry.participant_id} className={styles.resultRow}>
                  <span>#{entry.rank} {entry.participant_id}</span>
                  <span>{entry.score} pts {entry.tie ? '(ex-aequo)' : ''}</span>
                </div>
              ))}
            </div>
            <p className={styles.helper}>Action de sortie: retour a l espace participant.</p>
            <a className={styles.primaryBtn} href={`/participant?sessionId=${encodeURIComponent(String(context?.sessionId || runtimePayload?.session_id || ''))}`}>
              Sortir du challenge
            </a>
          </section>
        ) : null}
        </div>

        <aside className={styles.sideColumn}>
          <ChallengeTimerCard
            className={styles.card}
            title="Chrono"
            remainingSeconds={formatSeconds(remainingMs)}
            durationSeconds={Math.max(1, formatSeconds(Number(vom?.phase_deadline_ms || 0) - Number(vom?.phase_started_at_ms || 0)))}
            status={phase === 'voting_open' || phase === 'selecting_statement' || phase === 'reveal_pending' ? 'running' : 'idle'}
            isFacilitator={isFacilitator}
            waitingText="⏳ Chrono partagé pour l'equipe"
          />

          <section className={`${styles.card} ${styles.stateCard}`}>
            <h3>Etat live</h3>
            <div className={styles.stateGrid}>
              <div className={styles.stateRow}><span>Phase</span><strong>{phaseLabel(phase)}</strong></div>
              <div className={styles.stateRow}><span>Poseur</span><strong>{poserId || '-'}</strong></div>
              <div className={styles.stateRow}><span>Tour</span><strong>{Number(vom?.turn_index || 0) + 1}/{Number(vom?.total_turns || 0)}</strong></div>
              <div className={styles.stateRow}><span>Temps</span><strong>{formatSeconds(remainingMs)}s</strong></div>
            </div>
          </section>

          <section className={styles.card}>
            <h3>Scores rapides</h3>
            <div className={styles.resultList}>
              {participantsOrder.length === 0 ? <p className={styles.helper}>Aucun participant detecte.</p> : null}
              {participantsOrder.map((participant) => (
                <div key={participant} className={styles.resultRow}>
                  <span>{participant}</span>
                  <span>{Number(scores[participant] || 0)} pts</span>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.card}>
            <h3>Historique</h3>
            <p className={styles.helper}>{roundHistory.length} tours resolus</p>
            {roundHistory.length > 0 ? (
              <ul className={styles.historyList}>
                {roundHistory.slice(-5).reverse().map((round, idx) => (
                  <li key={`${String(round?.turn_index ?? idx)}-${String(round?.poser_id || idx)}`}>
                    <span>T{Number(round?.turn_index || 0) + 1}</span>
                    <span>{String(round?.poser_id || '-')}</span>
                    <span>{String(round?.revealed_truth || '-')}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          {chatEnabled ? (
            <ChallengeChatCard
              className={styles.card}
              title="Chat"
              messages={chatMessages}
              currentAuthor={displayName}
              inputValue={chatInput}
              onInputChange={setChatInput}
              onSubmit={submitChat}
              quickMessages={DEFAULT_CHALLENGE_QUICK_MESSAGES}
              onQuickMessage={sendQuickChat}
              placeholder="Ecrire un message"
              maxLength={240}
            />
          ) : null}
        </aside>
      </div>
    </div>
  );
}
