"use client";

import { Button, Input } from '@/components/ui';
import Modal from '@/components/ui/Modal';
import styles from '@/app/session-builder/SessionBuilder.module.css';

// Fenêtre du programme guidé : rendu seul, état et actions restent dans SessionBuilder.
export default function ProgramProposalModal({
  clearAll,
  expectedCount,
  formatProgramDuration,
  formatProgramParticipantRange,
  generateProgram,
  isGeneratingProgram,
  objectiveLabel,
  programError,
  programNotice,
  programOpen,
  programProposal,
  programProposalNeedsRefresh,
  replaceProposedChallenge,
  selectChallenge,
  selectedChallenges,
  setProgramError,
  setProgramNotice,
  setProgramOpen,
  setProgramProposalNeedsRefresh,
  setTargetMinutes,
  t,
  targetMinutes,
}) {
  return (
    <Modal
      open={programOpen}
      title={t('sessionBuilder.guidedProgram')}
      onClose={() => setProgramOpen(false)}
      overlayClassName={styles.programDialogOverlay}
      dialogClassName={styles.programDialog}
      headerClassName={styles.programDialogHeader}
      bodyClassName={styles.programDialogBody}
    >
      <div className={styles.programForm}>
        <p className={styles.programIntro}>{t('sessionBuilder.programDialogHint')}</p>
        <section className={styles.programCriteria} aria-labelledby="program-criteria-title">
          <h3 id="program-criteria-title">{t('sessionBuilder.programCriteria')}</h3>
          <div className={styles.programContext}>
            <span>{objectiveLabel || t('sessionBuilder.noPreference')}</span>
            <span className={!expectedCount ? styles.programContextNotice : undefined}>
              {expectedCount
                ? t('sessionBuilder.plannedCount', { count: expectedCount })
                : t('sessionBuilder.programUnknownCount')}
            </span>
          </div>
          <div className={styles.programCriteriaControls}>
            <Input
              id="program-duration"
              type="number"
              min="1"
              max="240"
              step="1"
              label={t('sessionBuilder.targetDuration')}
              value={targetMinutes}
              hint={t('sessionBuilder.targetDurationHint')}
              suffix={t('sessionBuilder.minutes')}
              disabled={isGeneratingProgram}
              onChange={(event) => {
                setTargetMinutes(event.target.value);
                setProgramProposalNeedsRefresh(Boolean(programProposal));
                setProgramError('');
                setProgramNotice('');
              }}
            />
            <Button
              variant="secondary"
              onClick={generateProgram}
              disabled={isGeneratingProgram}
              className={styles.programRegenerateButton}
            >
              {isGeneratingProgram ? (
                <>
                  <span className={styles.programLoadingIndicator} aria-hidden="true" />
                  {t('sessionBuilder.programGenerating')}
                </>
              ) : (
                t(
                  programProposal
                    ? 'sessionBuilder.regenerateProgram'
                    : 'sessionBuilder.generateProgram'
                )
              )}
            </Button>
          </div>
        </section>
        {programProposalNeedsRefresh ? (
          <p className={styles.programFeedbackNotice} role="status">
            {t('sessionBuilder.programNeedsRefresh')}
          </p>
        ) : null}
        {programError ? (
          <p className={styles.programFeedbackError} role="alert">
            {programError}
          </p>
        ) : null}
        {programNotice ? (
          <p className={styles.programFeedbackNotice} role="status">
            {programNotice}
          </p>
        ) : null}
        {programProposal ? (
          <>
            <section className={styles.programResults} aria-labelledby="program-results-title">
              <h3 id="program-results-title">{t('sessionBuilder.programResultsTitle')}</h3>
              <p className={styles.programEligibleCount}>
                {t('sessionBuilder.programEligibleCount', { count: programProposal.eligibleCount })}
              </p>
            </section>
            {programProposal.challenges.length ? (
              <>
                <div className={styles.programSummaryRow}>
                  <p>
                    {t('sessionBuilder.programDuration', {
                      count: programProposal.duration,
                    })}
                  </p>
                </div>
                <ol className={styles.programPreview}>
                  {programProposal.challenges.map((challenge, index) => (
                    <li key={challenge.id} className={styles.programPreviewItem}>
                      <span className={styles.programStepNumber} aria-hidden="true">{index + 1}</span>
                      <div className={styles.programPreviewContent}>
                        <strong>{challenge.name}</strong>
                        <small>
                          {formatProgramDuration(challenge)}
                          {' · '}
                          {formatProgramParticipantRange(challenge)}
                        </small>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isGeneratingProgram || programProposalNeedsRefresh}
                        aria-label={t('sessionBuilder.replaceChallengeAria', {
                          name: challenge.name,
                        })}
                        onClick={() => replaceProposedChallenge(challenge.id)}
                      >
                        {t('sessionBuilder.replaceChallenge')}
                      </Button>
                    </li>
                  ))}
                </ol>
                {selectedChallenges.length ? (
                  <p>{t('sessionBuilder.replaceProgramWarning')}</p>
                ) : null}
                <Button
                  block
                  disabled={isGeneratingProgram || programProposalNeedsRefresh}
                  onClick={() => {
                    clearAll();
                    programProposal.challenges.forEach((challenge) =>
                      selectChallenge(challenge.id)
                    );
                    setProgramOpen(false);
                  }}
                >
                  {t('sessionBuilder.useProgram')}
                </Button>
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </Modal>
  );
}
