'use client';

import styles from './TheQuiz.module.css';

function normalizeQuestion(quiz, isEn = false) {
  const source = quiz?.current_question || {};
  const options = Array.isArray(source?.options)
    ? source.options
    : Array.isArray(source?.choices)
      ? source.choices.map((choice) => String(choice?.label || ''))
      : [];

  return {
    id: source?.id || 'question',
    title: String(source?.question || source?.text || (isEn ? 'Question pending...' : 'Question en attente...')),
    options: options.map((value, index) => ({
      index,
      label: String(value || ''),
    })).slice(0, 4),
    category: String(source?.category || (isEn ? 'General knowledge' : 'Culture générale')),
    difficulty: String(source?.difficulty || (isEn ? 'medium' : 'moyen')),
    correctAnswer: Number.isInteger(Number(source?.correctAnswer)) ? Number(source.correctAnswer) : null,
  };
}

function formatRelativeMs(value) {
  const millis = Number(value || 0);
  if (!Number.isFinite(millis) || millis <= 0) return '-';
  if (millis < 1000) return `${millis} ms`;
  return `${Math.round((millis / 1000) * 10) / 10}s`;
}

function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function getRankMedal(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
}

function renderLeaderboardRows({ rows, maxScore, rankMovementByParticipantId = {}, isEn = false }) {
  return rows.map((entry, index) => {
    const participantKey = String(entry.participant_id);
    const movement = String(rankMovementByParticipantId[participantKey] || 'same');
    const movementLabel = movement === 'up' ? (isEn ? 'Up' : 'En hausse') : movement === 'down' ? (isEn ? 'Down' : 'En baisse') : (isEn ? 'Stable' : 'Stable');
    const movementGlyph = movement === 'up' ? '↑' : movement === 'down' ? '↓' : '→';
    const progressWidth = `${Math.min(100, Math.round((Number(entry.score || 0) / maxScore) * 100))}%`;
    const medal = getRankMedal(Number(entry.rank));

    return (
      <article
        key={entry.participant_id}
        className={`${styles.leaderboardCard}${index < 3 ? ` ${styles.leaderboardCardTop}` : ''}${movement === 'up' ? ` ${styles.rankUp}` : ''}${movement === 'down' ? ` ${styles.rankDown}` : ''}`}
      >
        <div className={styles.leaderboardIdentity}>
          <div className={styles.leaderboardRankWrap}>
            <span className={styles.rankPill}>{medal || `#${entry.rank}`}</span>
            <span className={`${styles.rankDeltaBadge}${movement === 'up' ? ` ${styles.rankDeltaUp}` : movement === 'down' ? ` ${styles.rankDeltaDown}` : ''}`} aria-label={movementLabel}>{movementGlyph}</span>
          </div>
          <span className={styles.leaderAvatar}>{getInitials(entry.display_name)}</span>
          <div className={styles.leaderboardCopy}>
            <span className={styles.leaderboardLine}>{entry.display_name}</span>
            <span className={styles.leaderboardSubline}>{isEn ? 'Live rank' : `Rang #${entry.rank}`}</span>
          </div>
        </div>

        <div className={styles.leaderboardScoreWrap}>
          <div className={styles.leaderboardScoreTopline}>
            <span className={styles.leaderboardScore}>{entry.score} pts</span>
            {medal ? <span className={styles.leaderboardReward}>{medal}</span> : null}
          </div>
          <span className={styles.leaderProgressTrack}>
            <span className={styles.leaderProgressFill} style={{ width: progressWidth }} />
          </span>
        </div>
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
  remainingSeconds,
  totalSeconds,
  participantsAnsweredCount,
  participantsTotal,
  onSubmitAnswer,
}) {
  const question = normalizeQuestion(quiz, isEn);
  const optionCount = question.options.length;
  const hasSelectedAnswer = Number.isInteger(Number(selectedAnswerIndex));

  function onAnswerKeyDown(event, answerIndex) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectAnswer(answerIndex);
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const currentIndex = Number.isInteger(Number(selectedAnswerIndex)) ? Number(selectedAnswerIndex) : answerIndex;
      onSelectAnswer((currentIndex + 1) % Math.max(optionCount, 1));
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const currentIndex = Number.isInteger(Number(selectedAnswerIndex)) ? Number(selectedAnswerIndex) : answerIndex;
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
        <p className={styles.questionPromptState}>{isAnswerLocked ? (isEn ? 'Answer sent and locked' : 'Réponse validée, verrouillée') : (isEn ? 'Choose your answer' : 'Choisissez votre réponse')}</p>
      </div>

      <div className={styles.answerGrid} role="radiogroup" aria-label={isEn ? 'Possible answers' : 'Réponses possibles'}>
        {question.options.map((choice) => {
          const active = Number(selectedAnswerIndex) === Number(choice.index);
          const ariaLabel = `${isEn ? 'Answer' : 'Réponse'} ${String.fromCharCode(65 + choice.index)} ${choice.label}`;
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
          disabled={isAnswerLocked || !hasSelectedAnswer}
        >
          {isAnswerLocked ? (isEn ? 'Answer sent' : 'Réponse envoyée') : (isEn ? 'Submit my answer' : 'Valider ma réponse')}
        </button>
      </div>
    </section>
  );
}

export function QuizLeaderboardScreen({ isEn = false, quiz, rankMovementByParticipantId = {} }) {
  const topRows = (quiz.leaderboard || []).slice(0, 10);
  const maxScore = Math.max(1, ...topRows.map((entry) => Number(entry.score || 0)));

  return (
    <section className={styles.rankingCardWrap}>
      <div className={styles.rankingCardHeader}>
        <h3 className={`${styles.rankingCardTitle} challenge-section-title`}>{isEn ? 'Leaderboard' : 'Classement'}</h3>
        <span className={styles.rankingMeta}>{isEn ? 'Live update' : 'Mis à jour en direct'}</span>
      </div>
      <div className={styles.leaderboardList}>
        {renderLeaderboardRows({ rows: topRows, maxScore, rankMovementByParticipantId, isEn })}
      </div>
    </section>
  );
}

export function QuizQuestionResultScreen({ isEn = false, quiz }) {
  const result = quiz.latest_question_result || {};
  const currentQuestion = normalizeQuestion(quiz, isEn);
  const serverAnswerIndex = Number(result.correct_choice_index);
  const questionAnswerIndex = Number(currentQuestion.correctAnswer);
  const answerIndex = Number.isInteger(serverAnswerIndex)
    ? serverAnswerIndex
    : (Number.isInteger(questionAnswerIndex) ? questionAnswerIndex : null);
  const answerLabel = Number.isInteger(answerIndex) && currentQuestion.options[answerIndex]
    ? currentQuestion.options[answerIndex].label
    : (isEn ? 'Answer unavailable' : 'Réponse non disponible');

  return (
    <section className={styles.screenCard}>
      <div className={styles.screenHeader}>
        <div>
          <p className={styles.kicker}>{isEn ? 'Question result' : 'Résultat question'}</p>
          <h2 className={styles.screenTitle}>{isEn ? 'Reveal of the correct answer and short debrief' : 'Reveal de la bonne réponse et micro-débrief'}</h2>
        </div>
        <span className={styles.phaseBadge}>Reveal</span>
      </div>

      <div className={styles.highlightPanel}>
        <p className={styles.highlightValue}>
          {isEn ? 'Correct answer' : 'Bonne réponse'}: {Number.isInteger(answerIndex) ? `${String.fromCharCode(65 + answerIndex)}. ${answerLabel}` : (isEn ? 'coming soon' : 'à venir')}
        </p>
        <p>{isEn ? 'Validated answers' : 'Réponses validées'}: {Number(result.answer_count || quiz.answer_count || 0)}</p>
        <p>{result.explanation || (isEn ? 'Reserved area for a short explanation of the answer.' : 'Zone réservée à l explication courte de la réponse.')}</p>
      </div>

      <div className={styles.rankingList}>
        {renderLeaderboardRows({
          rows: (quiz.leaderboard || []).slice(0, 5),
          maxScore: Math.max(1, ...(quiz.leaderboard || []).slice(0, 5).map((entry) => Number(entry.score || 0))),
          rankMovementByParticipantId: {},
          isEn,
        })}
      </div>
    </section>
  );
}

export function QuizFinalScreen({ isEn = false, quiz }) {
  const standings = Array.isArray(quiz.final_standings) ? quiz.final_standings : [];
  const questionHistory = Array.isArray(quiz.question_history) ? quiz.question_history : [];
  const winner = standings[0] || null;
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
        <article className={styles.metricCard}><span>{isEn ? 'Participants' : 'Participants'}</span><strong>{totalPlayers}</strong></article>
        <article className={styles.metricCard}><span>{isEn ? 'Winner' : 'Gagnant'}</span><strong>{winner?.display_name || '-'}</strong></article>
        <article className={styles.metricCard}><span>{isEn ? 'Winning score' : 'Score gagnant'}</span><strong>{winner?.score ?? 0} {isEn ? 'pts' : 'pts'}</strong></article>
      </div>

      <div className={styles.finalDebriefBlock}>
        <p className={styles.kicker}>{isEn ? 'Detailed ranking' : 'Classement détaillé'}</p>
        <div className={styles.rankingList}>
          {renderLeaderboardRows({
            rows: standings,
            maxScore: Math.max(1, ...standings.map((entry) => Number(entry.score || 0))),
            rankMovementByParticipantId: {},
            isEn,
          })}
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
            const answerIndex = Number.isInteger(Number(entry?.correct_choice_index))
              ? Number(entry.correct_choice_index)
              : Number(sourceQuestion?.correctAnswer);
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
