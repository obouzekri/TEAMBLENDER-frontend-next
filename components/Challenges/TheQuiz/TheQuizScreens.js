'use client';

import styles from './TheQuiz.module.css';
import { getQuizOptions, getQuizRankingStatus, normalizeQuizAnswerIndex } from '@/lib/challenges/quiz-utils';

function normalizeQuestion(quiz, isEn = false) {
  const source = quiz?.current_question || {};
  const options = getQuizOptions(source);

  return {
    id: source?.id || 'question',
    title: String(source?.question || source?.text || (isEn ? 'Question pending...' : 'Question en attente...')),
    options: options.map((value, index) => ({
      index,
      label: String(value || ''),
    })).slice(0, 4),
    category: String(source?.category || (isEn ? 'General knowledge' : 'Culture générale')),
    difficulty: String(source?.difficulty || (isEn ? 'medium' : 'moyen')),
    correctAnswer: normalizeQuizAnswerIndex(source?.correctAnswer, options.length),
  };
}

function formatRelativeMs(value) {
  const millis = Number(value || 0);
  if (!Number.isFinite(millis) || millis <= 0) return '-';
  if (millis < 1000) return `${millis} ms`;
  return `${Math.round((millis / 1000) * 10) / 10}s`;
}

function getRankMedal(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
}

function renderLeaderboardRows({ rows, rankMovementByParticipantId = {} }) {
  return rows.map((entry, index) => {
    const movement = String(rankMovementByParticipantId[String(entry.participant_id)] || 'same');
    const medal = getRankMedal(Number(entry.rank));

    return (
      <article
        key={entry.participant_id}
        className={`${styles.leaderboardCard}${index < 3 ? ` ${styles.leaderboardCardTop}` : ''}${movement === 'up' ? ` ${styles.rankUp}` : ''}${movement === 'down' ? ` ${styles.rankDown}` : ''}`}
      >
        <div className={styles.leaderboardIdentity}>
          <span className={styles.rankPill}>{medal || `#${entry.rank}`}</span>
          <span className={styles.leaderboardLine}>{entry.display_name}</span>
        </div>
        <span className={styles.leaderboardScore}>{entry.score} pts</span>
      </article>
    );
  });
}

export function QuizQuestionScreen({
  isEn = false,
  quiz,
  selectedAnswerIndex,
  onSelectAnswer,
  isAnswerLocked,
  isAnswerPending = false,
  isConnected = true,
  remainingSeconds,
  totalSeconds,
  participantsAnsweredCount,
  participantsTotal,
  onSubmitAnswer,
}) {
  const question = normalizeQuestion(quiz, isEn);
  const optionCount = question.options.length;
  const selectedIndex = normalizeQuizAnswerIndex(selectedAnswerIndex, optionCount);
  const hasSelectedAnswer = selectedIndex !== null;

  function onAnswerKeyDown(event, answerIndex) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectAnswer(answerIndex);
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const currentIndex = selectedIndex ?? answerIndex;
      onSelectAnswer((currentIndex + 1) % Math.max(optionCount, 1));
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const currentIndex = selectedIndex ?? answerIndex;
      onSelectAnswer((currentIndex + Math.max(optionCount, 1) - 1) % Math.max(optionCount, 1));
    }
  }

  return (
    <section className={styles.screenCard}>
      <div className={styles.screenHeader}>
        <div className={styles.questionHeadline}>
          <p className={styles.kicker}>{isEn ? 'Live question' : 'Question live'}</p>
          <h2 className={styles.screenTitle}>{question.title}</h2>
        </div>
        <span className={styles.phaseBadge}>{question.category}</span>
      </div>

      <div className={styles.questionPromptPanel} aria-live="polite">
        <p className={styles.questionPromptState}>{isAnswerLocked
          ? (isEn ? 'Answer sent and locked' : 'Réponse validée, verrouillée')
          : !isConnected
            ? (isEn ? 'Connection unavailable. Waiting to reconnect.' : 'Connexion indisponible. En attente de reconnexion.')
            : (isEn ? 'Choose your answer' : 'Choisissez votre réponse')}</p>
      </div>

      <div className={styles.answerGrid} role="radiogroup" aria-label={isEn ? 'Possible answers' : 'Réponses possibles'}>
        {question.options.map((choice) => {
          const active = selectedIndex === choice.index;
          const ariaLabel = `${isEn ? 'Answer' : 'Réponse'} ${String.fromCharCode(65 + choice.index)} ${choice.label}`;
          return (
            <button
              key={`${question.id}-${choice.index}`}
              type="button"
              className={`${styles.answerButton} ${active ? styles.answerButtonActive : ''} ${isAnswerLocked ? styles.answerButtonLocked : ''}`}
              onClick={() => onSelectAnswer(choice.index)}
              onKeyDown={(event) => onAnswerKeyDown(event, choice.index)}
              disabled={isAnswerLocked || !isConnected}
              role="radio"
              aria-checked={active}
              aria-label={ariaLabel}
            >
              <span className={styles.answerKey}>{String.fromCharCode(65 + choice.index)}</span>
              <span>{choice.label}</span>
              {active ? <span className={styles.answerSelectedBadge}>{isEn ? 'Selected' : 'Sélectionnée'}</span> : null}
            </button>
          );
        })}
      </div>

      <div className={styles.answerSubmitRow}>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={onSubmitAnswer}
          disabled={isAnswerLocked || !isConnected || !hasSelectedAnswer}
        >
          {isAnswerPending ? (isEn ? 'Awaiting confirmation...' : 'En attente de confirmation...') : isAnswerLocked ? (isEn ? 'Answer confirmed' : 'Réponse confirmée') : (isEn ? 'Submit my answer' : 'Valider ma réponse')}
        </button>
      </div>
    </section>
  );
}

export function QuizLeaderboardScreen({ isEn = false, quiz, rankMovementByParticipantId = {} }) {
  const topRows = (quiz.leaderboard || []).slice(0, 10);
  const status = quiz.leaderboard_status || getQuizRankingStatus(quiz.leaderboard, quiz.phase);

  return (
    <section className={styles.rankingCardWrap}>
      <div className={styles.rankingCardHeader}>
        <h3 className={`${styles.rankingCardTitle} challenge-section-title`}>{isEn ? 'Leaderboard' : 'Classement'}</h3>
        <span className={styles.rankingMeta}>{isEn ? 'Live update' : 'Mis à jour en direct'}</span>
      </div>
      <div className={styles.leaderboardList}>
        {status === 'ready' ? renderLeaderboardRows({ rows: topRows, rankMovementByParticipantId }) : <QuizRankingNotice isEn={isEn} status={status} />}
      </div>
    </section>
  );
}

function QuizRankingNotice({ isEn, status }) {
  const messages = {
    pending: isEn ? 'Leaderboard pending: no scores received yet.' : 'Classement en attente : aucun score reçu pour le moment.',
    empty: isEn ? 'No scores recorded for this quiz.' : 'Aucun score enregistré pour ce quiz.',
    unavailable: isEn ? 'Leaderboard data unavailable.' : 'Données du classement indisponibles.',
  };
  return <p className={styles.helperText} role="status">{messages[status]}</p>;
}

export function QuizQuestionResultScreen({ isEn = false, quiz, mySelectedAnswerIndex = null, isFacilitator = false }) {
  const result = quiz.latest_question_result || {};
  const currentQuestion = normalizeQuestion({ current_question: result.question || quiz.current_question }, isEn);
  const answerIndex = normalizeQuizAnswerIndex(result.correct_choice_index, currentQuestion.options.length)
    ?? currentQuestion.correctAnswer;
  const answerLabel = Number.isInteger(answerIndex) && currentQuestion.options[answerIndex]
    ? currentQuestion.options[answerIndex].label
    : (isEn ? 'Answer unavailable' : 'Réponse non disponible');

  const myAnswerIndex = normalizeQuizAnswerIndex(mySelectedAnswerIndex, currentQuestion.options.length);
  const hasMyAnswer = myAnswerIndex !== null;
  const myAnswerIsCorrect = hasMyAnswer && answerIndex !== null && myAnswerIndex === answerIndex;
  const myAnswerBadgeClass = !hasMyAnswer || answerIndex === null
    ? styles.myAnswerBadgeNone
    : myAnswerIsCorrect
      ? styles.myAnswerBadgeCorrect
      : styles.myAnswerBadgeIncorrect;
  const myAnswerBadgeLabel = !hasMyAnswer
    ? (isEn ? 'No answer submitted' : 'Aucune réponse envoyée')
    : answerIndex === null
      ? (isEn ? 'Your answer was submitted; result unavailable' : 'Votre réponse a été envoyée ; résultat indisponible')
    : myAnswerIsCorrect
      ? (isEn ? 'Your answer was correct' : 'Votre réponse est correcte')
      : (isEn ? 'Your answer was incorrect' : 'Votre réponse est incorrecte');
  const explanationText = typeof result.explanation === 'string' ? result.explanation.trim() : '';
  const shouldShowExplanation = Boolean(explanationText && !explanationText.toLowerCase().includes('zone réservée') && !explanationText.toLowerCase().includes('reserved area'));

  return (
    <section className={styles.screenCard}>
      <div className={styles.screenHeader}>
        <div>
          <p className={styles.kicker}>{isEn ? 'Question result' : 'Résultat question'}</p>
          <h2 className={styles.screenTitle}>{isEn ? 'Reveal of the correct answer and short debrief' : 'Reveal de la bonne réponse et micro-débrief'}</h2>
        </div>
      </div>

      {!isFacilitator ? (
        <p className={`${styles.myAnswerBadge} ${myAnswerBadgeClass}`}>{myAnswerBadgeLabel}</p>
      ) : null}

      <div className={styles.highlightPanel} role="status" aria-live="polite">
        <div className={styles.answerRevealCard}>
          <span className={styles.answerRevealLabel}>
            <span className={styles.answerStatusIcon} aria-hidden="true">✓</span>
            {isEn ? 'Correct answer' : 'Bonne réponse'}
          </span>
          <strong className={styles.correctAnswerValue}>
            {Number.isInteger(answerIndex) ? `${String.fromCharCode(65 + answerIndex)}. ${answerLabel}` : (isEn ? 'coming soon' : 'à venir')}
          </strong>
        </div>

        {shouldShowExplanation ? <p className={styles.highlightExplanation}>{explanationText}</p> : null}
      </div>
    </section>
  );
}

export function QuizFinalScreen({ isEn = false, quiz }) {
  const standings = Array.isArray(quiz.final_standings) ? quiz.final_standings : [];
  const status = quiz.final_standings_status || getQuizRankingStatus(quiz.final_standings, 'final_score');
  const questionHistory = Array.isArray(quiz.question_history) ? quiz.question_history : [];
  const winner = status === 'ready' ? standings[0] : null;
  const totalPlayers = standings.length;

  return (
    <section className={styles.screenCard}>
      <div className={styles.screenHeader}>
        <div>
          <p className={styles.kicker}>{isEn ? 'Final score' : 'Score final'}</p>
          <h2 className={styles.screenTitle}>{isEn ? 'Final session ranking' : 'Classement final de la session'}</h2>
        </div>
        <span className={styles.phaseBadge}>Final</span>
      </div>

      <div className={styles.finalSummaryGrid}>
        <article className={styles.metricCard}><span>{isEn ? 'Participants' : 'Participants'}</span><strong>{status === 'ready' ? totalPlayers : '-'}</strong></article>
        <article className={styles.metricCard}><span>{isEn ? 'Winner' : 'Gagnant'}</span><strong>{winner?.display_name || '-'}</strong></article>
        <article className={styles.metricCard}><span>{isEn ? 'Winning score' : 'Score gagnant'}</span><strong>{winner ? `${winner.score} pts` : '-'}</strong></article>
      </div>

      <div className={styles.finalRankingBlock}>
        <p className={styles.kicker}>{isEn ? 'Detailed ranking' : 'Classement détaillé'}</p>
        <div className={styles.rankingList}>
          {status === 'ready' ? renderLeaderboardRows({
            rows: standings,
            rankMovementByParticipantId: {},
          }) : <QuizRankingNotice isEn={isEn} status={status} />}
        </div>
      </div>

      <div className={styles.finalDebriefBlock}>
        <p className={styles.kicker}>{isEn ? 'Final debrief' : 'Débrief final'}</p>
        <div className={styles.debriefList}>
          {questionHistory.length > 0 ? questionHistory.map((entry) => {
            const sourceQuestion = entry?.question || {};
            const title = String(sourceQuestion?.question || sourceQuestion?.text || (isEn ? 'Question unavailable' : 'Question indisponible'));
            const options = Array.isArray(sourceQuestion?.options)
              ? sourceQuestion.options
              : Array.isArray(sourceQuestion?.choices)
                ? sourceQuestion.choices.map((choice) => String(choice?.label || ''))
                : [];
            const answerIndex = normalizeQuizAnswerIndex(entry?.correct_choice_index, options.length)
              ?? normalizeQuizAnswerIndex(sourceQuestion?.correctAnswer, options.length);
            const answerLabel = Number.isInteger(answerIndex) && options[answerIndex]
              ? `${String.fromCharCode(65 + answerIndex)}. ${String(options[answerIndex] || '')}`
              : (isEn ? 'Answer unavailable' : 'Réponse indisponible');

            return (
              <article key={`${entry?.question_id || title}-${entry?.question_index || 0}`} className={styles.debriefCard}>
                <p className={styles.debriefQuestion}>{`${isEn ? 'Question' : 'Question'} ${Number(entry?.question_index || 0) + 1}`}</p>
                <h3 className={styles.debriefTitle}>{title}</h3>
                <p className={styles.debriefAnswer}><strong>{isEn ? 'Correct answer:' : 'Bonne réponse :'}</strong> {answerLabel}</p>
                {entry?.explanation ? <p className={styles.debriefExplanation}>{String(entry.explanation)}</p> : null}
              </article>
            );
          }) : (
            <p className={styles.helperText}>{isEn ? 'Question recap unavailable for this session.' : 'Le récapitulatif des questions n est pas disponible pour cette session.'}</p>
          )}
        </div>
      </div>
    </section>
  );
}
