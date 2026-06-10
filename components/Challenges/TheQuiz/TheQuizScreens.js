'use client';

import styles from './TheQuiz.module.css';

function formatDuration(seconds) {
  const safe = Math.max(0, Number(seconds || 0));
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function normalizeQuestion(quiz) {
  const source = quiz?.current_question || {};
  const options = Array.isArray(source?.options)
    ? source.options
    : Array.isArray(source?.choices)
      ? source.choices.map((choice) => String(choice?.label || ''))
      : [];

  return {
    id: source?.id || 'question',
    title: String(source?.question || source?.text || 'Question en attente...'),
    options: options.map((value, index) => ({
      index,
      label: String(value || ''),
    })).slice(0, 4),
    category: String(source?.category || 'Culture générale'),
    difficulty: String(source?.difficulty || 'moyen'),
    correctAnswer: Number.isInteger(Number(source?.correctAnswer)) ? Number(source.correctAnswer) : null,
  };
}

function formatRelativeMs(value) {
  const millis = Number(value || 0);
  if (!Number.isFinite(millis) || millis <= 0) return '-';
  if (millis < 1000) return `${millis} ms`;
  return `${Math.round((millis / 1000) * 10) / 10}s`;
}

function buildProgressValue(current, total) {
  const safeTotal = Math.max(1, Number(total || 1));
  const safeCurrent = Math.max(1, Number(current || 1));
  return Math.max(0, Math.min(100, Math.round((safeCurrent / safeTotal) * 100)));
}

function TimerRing({ remainingSeconds, totalSeconds }) {
  const safeTotal = Math.max(1, Number(totalSeconds || 1));
  const safeRemaining = Math.max(0, Number(remainingSeconds || 0));
  const ratio = Math.max(0, Math.min(1, safeRemaining / safeTotal));
  const degrees = Math.round(360 * ratio);
  const danger = safeRemaining <= Math.min(8, Math.floor(safeTotal / 3));

  return (
    <div
      className={`${styles.timerRing} ${danger ? styles.timerRingDanger : ''}`}
      style={{ '--quiz-timer-deg': `${degrees}deg` }}
      role="timer"
      aria-live="polite"
      aria-label={`Temps restant ${safeRemaining} secondes`}
    >
      <div className={styles.timerRingInner}>
        <strong>{safeRemaining}s</strong>
        <span>{formatDuration(safeRemaining)}</span>
      </div>
    </div>
  );
}

export function QuizQuestionScreen({
  quiz,
  selectedAnswerIndex,
  onSelectAnswer,
  isAnswerLocked,
  remainingSeconds,
  totalSeconds,
  participantsAnsweredCount,
  participantsTotal,
  onSubmitAnswer,
}) {
  const question = normalizeQuestion(quiz);
  const currentQuestionNumber = Number(quiz?.question_index || 0) + 1;
  const progress = buildProgressValue(currentQuestionNumber, quiz?.question_count || 1);
  const keyboardHint = isAnswerLocked
    ? 'Réponse verrouillée.'
    : 'Raccourcis: flèches pour naviguer, Entrée ou Espace pour sélectionner.';

  function onAnswerKeyDown(event, answerIndex) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectAnswer(answerIndex);
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      onSelectAnswer((Number(selectedAnswerIndex || 0) + 1) % 4);
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      onSelectAnswer((Number(selectedAnswerIndex || 0) + 3) % 4);
    }
  }

  return (
    <section className={styles.screenCard}>
      <div className={styles.screenHeader}>
        <div className={styles.questionHeadline}>
          <p className={styles.kicker}>Question live</p>
          <h2 className={styles.screenTitle}>{question.title}</h2>
        </div>
        <span className={styles.phaseBadge}>{question.category}</span>
      </div>

      <div className={styles.questionMetaRow}>
        <span>{currentQuestionNumber}/{quiz.question_count}</span>
        <span>Difficulté: {question.difficulty}</span>
        <span>{participantsAnsweredCount}/{participantsTotal} réponses reçues</span>
      </div>

      <p className={styles.helperText}>{keyboardHint}</p>

      <div className={styles.questionProgressWrap}>
        <div className={styles.questionProgressBar} style={{ '--quiz-progress': `${progress}%` }} aria-hidden="true" />
        <span className={styles.questionProgressLabel}>Progression {progress}%</span>
      </div>

      <div className={styles.questionTopRow}>
        <TimerRing remainingSeconds={remainingSeconds} totalSeconds={totalSeconds} />
        <div className={styles.questionStatusCard} aria-live="polite">
          <p>{isAnswerLocked ? 'Réponse validée, verrouillée' : 'Choisissez votre réponse avant la fin du timer'}</p>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={onSubmitAnswer}
            disabled={isAnswerLocked || !Number.isInteger(Number(selectedAnswerIndex))}
          >
            {isAnswerLocked ? 'Réponse envoyée' : 'Valider ma réponse'}
          </button>
        </div>
      </div>

      <div className={styles.answerGrid} role="radiogroup" aria-label="Réponses possibles">
        {question.options.map((choice) => {
          const active = Number(selectedAnswerIndex) === Number(choice.index);
          const ariaLabel = `Réponse ${String.fromCharCode(65 + choice.index)} ${choice.label}`;
          return (
            <button
              key={`${question.id}-${choice.index}`}
              type="button"
              className={`${styles.answerButton} ${active ? styles.answerButtonActive : ''} ${isAnswerLocked ? styles.answerButtonLocked : ''}`}
              onClick={() => onSelectAnswer(choice.index)}
              onKeyDown={(event) => onAnswerKeyDown(event, choice.index)}
              disabled={isAnswerLocked}
              role="radio"
              aria-checked={active}
              aria-label={ariaLabel}
            >
              <span className={styles.answerKey}>{String.fromCharCode(65 + choice.index)}</span>
              <span>{choice.label}</span>
              {active ? <span className={styles.answerSelectedBadge}>Sélectionnée</span> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function QuizLeaderboardScreen({ quiz, rankMovementByParticipantId = {} }) {
  const topRows = (quiz.leaderboard || []).slice(0, 10);

  return (
    <section className={styles.screenCard}>
      <div className={styles.screenHeader}>
        <div>
          <p className={styles.kicker}>Leaderboard live</p>
          <h2 className={styles.screenTitle}>Classement mis à jour en temps réel</h2>
        </div>
        <span className={styles.phaseBadge}>Live</span>
      </div>

      <div className={styles.rankingList}>
        {topRows.map((entry) => (
          <article
            key={entry.participant_id}
            className={`${styles.rankingCard} ${rankMovementByParticipantId[String(entry.participant_id)] === 'up' ? styles.rankUp : ''} ${rankMovementByParticipantId[String(entry.participant_id)] === 'down' ? styles.rankDown : ''}`}
          >
            <strong>#{entry.rank}</strong>
            <span>{entry.display_name}</span>
            <span>{entry.score} pts</span>
            <span className={styles.rankDeltaBadge}>
              {rankMovementByParticipantId[String(entry.participant_id)] === 'up'
                ? '▲'
                : rankMovementByParticipantId[String(entry.participant_id)] === 'down'
                  ? '▼'
                  : '•'}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}

export function QuizQuestionResultScreen({ quiz }) {
  const result = quiz.latest_question_result || {};
  const currentQuestion = normalizeQuestion(quiz);
  const answerIndex = Number.isInteger(Number(result.correct_choice_index))
    ? Number(result.correct_choice_index)
    : currentQuestion.correctAnswer;
  const answerLabel = Number.isInteger(answerIndex) && currentQuestion.options[answerIndex]
    ? currentQuestion.options[answerIndex].label
    : 'Réponse non disponible';

  return (
    <section className={styles.screenCard}>
      <div className={styles.screenHeader}>
        <div>
          <p className={styles.kicker}>Résultat question</p>
          <h2 className={styles.screenTitle}>Reveal de la bonne réponse et micro-débrief</h2>
        </div>
        <span className={styles.phaseBadge}>Reveal</span>
      </div>

      <div className={styles.highlightPanel}>
        <p className={styles.highlightValue}>
          Bonne réponse: {Number.isInteger(answerIndex) ? `${String.fromCharCode(65 + answerIndex)}. ${answerLabel}` : 'à venir'}
        </p>
        <p>Réponses validées: {Number(result.answer_count || quiz.answer_count || 0)}</p>
        <p>{result.explanation || 'Zone réservée à l explication courte de la réponse.'}</p>
      </div>

      <div className={styles.rankingList}>
        {(quiz.leaderboard || []).slice(0, 5).map((entry) => (
          <article key={entry.participant_id} className={styles.rankingCard}>
            <strong>#{entry.rank}</strong>
            <span>{entry.display_name}</span>
            <span>{entry.score} pts</span>
          </article>
        ))}
      </div>
    </section>
  );
}

export function QuizFinalScreen({ quiz }) {
  const standings = Array.isArray(quiz.final_standings) ? quiz.final_standings : [];
  const winner = standings[0] || null;
  const totalPlayers = standings.length;

  return (
    <section className={styles.screenCard}>
      <div className={styles.screenHeader}>
        <div>
          <p className={styles.kicker}>Score final</p>
          <h2 className={styles.screenTitle}>Classement final de la session</h2>
        </div>
        <span className={styles.phaseBadge}>Final</span>
      </div>

      <div className={styles.finalSummaryGrid}>
        <article className={styles.metricCard}><span>Participants</span><strong>{totalPlayers}</strong></article>
        <article className={styles.metricCard}><span>Gagnant</span><strong>{winner?.display_name || '-'}</strong></article>
        <article className={styles.metricCard}><span>Score gagnant</span><strong>{winner?.score ?? 0} pts</strong></article>
      </div>

      <div className={styles.finalDebriefBlock}>
        <p className={styles.kicker}>Classement détaillé</p>
        <div className={styles.rankingList}>
          {standings.map((entry) => (
            <article key={entry.participant_id} className={styles.rankingCard}>
              <strong>#{entry.rank}</strong>
              <span>{entry.display_name}</span>
              <span>{entry.score} pts</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function QuizHostControlScreen({ quiz, onAction, isBusy = false }) {
  const connectedCount = Number(quiz?.connected_count || 0);
  const canStartChallenge = connectedCount >= 2;

  return (
    <section className={styles.screenCard}>
      <div className={styles.screenHeader}>
        <div>
          <p className={styles.kicker}>Écran animateur/admin</p>
          <h2 className={styles.screenTitle}>Console de pilotage de manche</h2>
        </div>
        <span className={styles.phaseBadge}>Host</span>
      </div>

      <div className={styles.hostGrid}>
        <article className={styles.metricCard}><span>Phase</span><strong>{quiz.phase}</strong></article>
        <article className={styles.metricCard}><span>Question active</span><strong>{quiz.question_index + 1}</strong></article>
        <article className={styles.metricCard}><span>Réponses reçues</span><strong>{quiz.answer_count || 0}</strong></article>
        <article className={styles.metricCard}><span>Leaderboard</span><strong>{quiz.leaderboard_enabled ? 'ON' : 'OFF'}</strong></article>
      </div>

      {!canStartChallenge ? (
        <p className={styles.helperText}>Au moins 2 participants doivent être connectés pour démarrer le challenge.</p>
      ) : null}

      <div className={styles.hostActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => onAction('quiz.session.start')}
          disabled={isBusy || !canStartChallenge}
        >
          Lancer la manche
        </button>
        <button type="button" className={styles.secondaryButton} onClick={() => onAction('quiz.session.pause')} disabled={isBusy}>Pause</button>
        <button type="button" className={styles.secondaryButton} onClick={() => onAction('quiz.session.resume')} disabled={isBusy}>Reprendre</button>
        <button type="button" className={styles.secondaryButton} onClick={() => onAction('quiz.question.skip')} disabled={isBusy}>Question suivante</button>
        <button type="button" className={styles.secondaryButton} onClick={() => onAction('quiz.session.finish')} disabled={isBusy}>Terminer la session</button>
      </div>
    </section>
  );
}

export function QuizHostResponsesScreen({ quiz }) {
  const participants = quiz.participants || [];
  const liveAnswers = quiz.live_answers_by_participant && typeof quiz.live_answers_by_participant === 'object'
    ? quiz.live_answers_by_participant
    : {};

  return (
    <section className={styles.screenCard}>
      <div className={styles.screenHeader}>
        <div>
          <p className={styles.kicker}>Réponses live participants</p>
          <h2 className={styles.screenTitle}>Vue animateur sur les validations en cours</h2>
        </div>
        <span className={styles.phaseBadge}>Live answers</span>
      </div>

      <div className={styles.answersFeed}>
        {participants.map((participant, index) => (
          <article key={participant.participant_id} className={styles.answerFeedCard}>
            <strong>{participant.display_name}</strong>
            <span>
              {liveAnswers[String(participant.participant_id)]
                ? `Réponse #${Number(liveAnswers[String(participant.participant_id)]?.selected_option || 0) + 1}`
                : `En attente #${(index % 4) + 1}`}
            </span>
            <span>{participant.is_connected ? 'Connecté' : 'Hors ligne'}</span>
            <span>{liveAnswers[String(participant.participant_id)] ? formatRelativeMs(liveAnswers[String(participant.participant_id)]?.response_time_ms) : '-'}</span>
          </article>
        ))}
      </div>
    </section>
  );
}