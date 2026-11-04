'use client';

import styles from './TheQuiz.module.css';
import ChallengeDebriefHeading from '../ChallengeDebriefHeading';
import { getQuizOptions, getQuizRankingStatus, normalizeQuizAnswerIndex } from '@/lib/challenges/quiz-utils';
import { translate } from '@/lib/i18n';

function normalizeQuestion(quiz, locale) {
  const source = quiz?.current_question || {};
  const options = getQuizOptions(source);

  return {
    id: source?.id || 'question',
    title: String(source?.question || source?.text || translate(locale, 'challengeQuiz.questionPending')),
    options: options.map((value, index) => ({
      index,
      label: String(value || ''),
    })).slice(0, 4),
    category: String(source?.category || translate(locale, 'challengeQuiz.generalKnowledge')),
    difficulty: String(source?.difficulty || translate(locale, 'challengeQuiz.medium')),
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

function renderLeaderboardRows({ rows, rankMovementByParticipantId = {}, showMedals = true }) {
  return rows.map((entry, index) => {
    const movement = String(rankMovementByParticipantId[String(entry.participant_id)] || 'same');
    const medal = showMedals ? getRankMedal(Number(entry.rank)) : null;

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
  locale,
  isFacilitator = false,
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
  const question = normalizeQuestion(quiz, locale);
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
          <h2 className={styles.screenTitle}>{question.title}</h2>
        </div>
        <span className={styles.phaseBadge}>{question.category}</span>
      </div>

      {isFacilitator ? (
        <p className={styles.facilitatorNotice} role="status">
          {translate(locale, 'challengeQuiz.onlyParticipantsCanAnswer')}
        </p>
      ) : <div className={styles.questionPromptPanel} aria-live="polite">
        <p className={styles.questionPromptState}>{isAnswerLocked
          ? translate(locale, 'challengeQuiz.answerSentAndLocked')
          : !isConnected
            ? translate(locale, 'challengeQuiz.connectionUnavailableWaitingToReconnect')
            : translate(locale, 'challengeQuiz.chooseYourAnswer')}</p>
      </div>}

      <div className={styles.answerGrid} role={isFacilitator ? 'group' : 'radiogroup'} aria-label={translate(locale, 'challengeQuiz.possibleAnswers')}>
        {question.options.map((choice) => {
          if (isFacilitator) {
            return (
              <div key={`${question.id}-${choice.index}`} className={`${styles.answerButton} ${styles.answerReadOnly}`}>
                <span className={styles.answerKey}>{String.fromCharCode(65 + choice.index)}</span>
                <span>{choice.label}</span>
              </div>
            );
          }
          const active = selectedIndex === choice.index;
          const ariaLabel = `${translate(locale, 'challengeQuiz.answer')} ${String.fromCharCode(65 + choice.index)} ${choice.label}`;
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
              {active ? <span className={styles.answerSelectedBadge}>{translate(locale, 'challengeQuiz.selected')}</span> : null}
            </button>
          );
        })}
      </div>

      {!isFacilitator ? <div className={styles.answerSubmitRow}>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={onSubmitAnswer}
          disabled={isAnswerLocked || !isConnected || !hasSelectedAnswer}
        >
          {isAnswerPending ? translate(locale, 'challengeQuiz.awaitingConfirmation') : isAnswerLocked ? translate(locale, 'challengeQuiz.answerConfirmed') : translate(locale, 'challengeQuiz.submitMyAnswer')}
        </button>
      </div> : null}
    </section>
  );
}

export function QuizLeaderboardScreen({ locale, quiz, rankMovementByParticipantId = {} }) {
  const topRows = (quiz.leaderboard || []).slice(0, 10);
  const status = quiz.leaderboard_status || getQuizRankingStatus(quiz.leaderboard, quiz.phase);

  return (
    <section className={styles.rankingCardWrap}>
      <div className={styles.rankingCardHeader}>
        <h3 className={`${styles.rankingCardTitle} challenge-section-title`}>{translate(locale, 'challengeQuiz.leaderboard')}</h3>
        <span className={styles.rankingMeta}>{translate(locale, 'challengeQuiz.liveUpdate')}</span>
      </div>
      <div className={styles.leaderboardList}>
        {status === 'ready' ? renderLeaderboardRows({ rows: topRows, rankMovementByParticipantId }) : <QuizRankingNotice locale={locale} status={status} />}
      </div>
    </section>
  );
}

function QuizRankingNotice({ locale, status }) {
  const messages = {
    pending: translate(locale, 'challengeQuiz.leaderboardPendingNoScoresReceivedYet'),
    empty: translate(locale, 'challengeQuiz.noScoresRecordedForThisQuiz'),
    unavailable: translate(locale, 'challengeQuiz.leaderboardDataUnavailable'),
  };
  return <p className={styles.helperText} role="status">{messages[status]}</p>;
}

export function QuizQuestionResultScreen({ locale, quiz, mySelectedAnswerIndex = null, isFacilitator = false }) {
  const result = quiz.latest_question_result || {};
  const currentQuestion = normalizeQuestion({ current_question: result.question || quiz.current_question }, locale);
  const answerIndex = normalizeQuizAnswerIndex(result.correct_choice_index, currentQuestion.options.length)
    ?? currentQuestion.correctAnswer;
  const answerLabel = Number.isInteger(answerIndex) && currentQuestion.options[answerIndex]
    ? currentQuestion.options[answerIndex].label
    : translate(locale, 'challengeQuiz.answerUnavailable');

  const myAnswerIndex = normalizeQuizAnswerIndex(mySelectedAnswerIndex, currentQuestion.options.length);
  const hasMyAnswer = myAnswerIndex !== null;
  const myAnswerIsCorrect = hasMyAnswer && answerIndex !== null && myAnswerIndex === answerIndex;
  const myAnswerBadgeClass = !hasMyAnswer || answerIndex === null
    ? styles.myAnswerBadgeNone
    : myAnswerIsCorrect
      ? styles.myAnswerBadgeCorrect
      : styles.myAnswerBadgeIncorrect;
  const myAnswerBadgeLabel = !hasMyAnswer
    ? translate(locale, 'challengeQuiz.noAnswerSubmitted')
    : answerIndex === null
      ? translate(locale, 'challengeQuiz.yourAnswerWasSubmittedResultUnavailable')
    : myAnswerIsCorrect
      ? translate(locale, 'challengeQuiz.yourAnswerWasCorrect')
      : translate(locale, 'challengeQuiz.yourAnswerWasIncorrect');
  const explanationText = typeof result.explanation === 'string' ? result.explanation.trim() : '';
  const shouldShowExplanation = Boolean(explanationText && !explanationText.toLowerCase().includes('zone réservée') && !explanationText.toLowerCase().includes('reserved area'));

  return (
    <section className={styles.screenCard}>
      <div className={styles.screenHeader}>
        <div>
          <p className={styles.kicker}>{translate(locale, 'challengeQuiz.questionResult')}</p>
          <h2 className={styles.screenTitle}>{currentQuestion.title}</h2>
        </div>
      </div>

      {!isFacilitator ? (
        <p className={`${styles.myAnswerBadge} ${myAnswerBadgeClass}`}>{myAnswerBadgeLabel}</p>
      ) : null}

      <div className={styles.highlightPanel} role="status" aria-live="polite">
        <div className={styles.answerRevealCard}>
          <span className={styles.answerRevealLabel}>
            <span className={styles.answerStatusIcon} aria-hidden="true">✓</span>
            {translate(locale, 'challengeQuiz.correctAnswer')}
          </span>
          <strong className={styles.correctAnswerValue}>
            {Number.isInteger(answerIndex) ? `${String.fromCharCode(65 + answerIndex)}. ${answerLabel}` : translate(locale, 'challengeQuiz.comingSoon')}
          </strong>
        </div>

        {shouldShowExplanation ? <p className={styles.highlightExplanation}>{explanationText}</p> : null}
      </div>
    </section>
  );
}

export function QuizFinalScreen({ locale, quiz }) {
  const standings = Array.isArray(quiz.final_standings) ? quiz.final_standings : [];
  const status = quiz.final_standings_status || getQuizRankingStatus(quiz.final_standings, 'final_score');
  const questionHistory = Array.isArray(quiz.question_history) ? quiz.question_history : [];
  const winner = status === 'ready' ? standings[0] : null;
  const totalPlayers = standings.length;

  return (
    <section className={styles.screenCard} data-debrief-content>
      <ChallengeDebriefHeading />

      <div className={styles.finalSummaryGrid} data-debrief-metrics>
        <article className={styles.metricCard}><span>{translate(locale, 'challengeQuiz.participants')}</span><strong>{status === 'ready' ? totalPlayers : '-'}</strong></article>
        <article className={styles.metricCard}><span>{translate(locale, 'challengeQuiz.winner')}</span><strong>{winner?.display_name || '-'}</strong></article>
        <article className={styles.metricCard}><span>{translate(locale, 'challengeQuiz.winningScore')}</span><strong>{winner ? `${winner.score} pts` : '-'}</strong></article>
      </div>

      <div className={styles.finalRankingBlock}>
        <h3>{translate(locale, 'challengeQuiz.detailedRanking')}</h3>
        <div className={styles.rankingList}>
          {status === 'ready' ? renderLeaderboardRows({
            rows: standings,
            rankMovementByParticipantId: {},
            showMedals: false,
          }) : <QuizRankingNotice locale={locale} status={status} />}
        </div>
      </div>

      <div className={styles.finalDebriefBlock}>
        <h3>{translate(locale, 'challengeQuiz.finalDebrief')}</h3>
        <div className={styles.debriefList}>
          {questionHistory.length > 0 ? questionHistory.map((entry) => {
            const sourceQuestion = entry?.question || {};
            const title = String(sourceQuestion?.question || sourceQuestion?.text || translate(locale, 'challengeQuiz.questionUnavailable'));
            const options = Array.isArray(sourceQuestion?.options)
              ? sourceQuestion.options
              : Array.isArray(sourceQuestion?.choices)
                ? sourceQuestion.choices.map((choice) => String(choice?.label || ''))
                : [];
            const answerIndex = normalizeQuizAnswerIndex(entry?.correct_choice_index, options.length)
              ?? normalizeQuizAnswerIndex(sourceQuestion?.correctAnswer, options.length);
            const answerLabel = Number.isInteger(answerIndex) && options[answerIndex]
              ? `${String.fromCharCode(65 + answerIndex)}. ${String(options[answerIndex] || '')}`
              : translate(locale, 'challengeQuiz.answerUnavailable2');

            return (
              <article key={`${entry?.question_id || title}-${entry?.question_index || 0}`} className={styles.debriefCard}>
                <p className={styles.debriefQuestion}>{`${translate(locale, 'challengeQuiz.question')} ${Number(entry?.question_index || 0) + 1}`}</p>
                <h3 className={styles.debriefTitle}>{title}</h3>
                <p className={styles.debriefAnswer}><strong>{translate(locale, 'challengeQuiz.correctAnswer2')}</strong> {answerLabel}</p>
                {entry?.explanation ? <p className={styles.debriefExplanation}>{String(entry.explanation)}</p> : null}
              </article>
            );
          }) : (
            <p className={styles.helperText}>{translate(locale, 'challengeQuiz.questionRecapUnavailableForThisSession')}</p>
          )}
        </div>
      </div>
    </section>
  );
}
