"use client";

import { Button, Input } from '@/components/ui';
import Modal from '@/components/ui/Modal';
import ParticipantAssigner from '@/components/SessionBuilder/ParticipantAssigner';
import { isValidExpectedCount } from '@/lib/sessionProgram.mjs';
import styles from '@/app/session-builder/SessionBuilder.module.css';

// Fenêtre de modification des informations de session : rendu seul, état et actions restent dans SessionBuilder.
export default function SessionInfoEditModal({
  editDateTime,
  editExpectedCount,
  editFlowMode,
  editName,
  editObjective,
  editParticipantIds,
  handleSaveSessionInfo,
  isEditingSessionInfo,
  isSavingSessionInfo,
  renderObjectiveField,
  setEditDateTime,
  setEditExpectedCount,
  setEditFlowMode,
  setEditName,
  setEditObjective,
  setEditParticipantIds,
  setIsEditingSessionInfo,
  t,
}) {
  return (
    <Modal
      open={isEditingSessionInfo}
      title={t('sessionBuilder.editSessionAria')}
      onClose={() => setIsEditingSessionInfo(false)}
      dialogClassName={styles.sessionInfoEditDialog}
      bodyClassName={styles.sessionInfoEditBody}
    >
      <section
        className={styles.sessionInfoEditContent}
        aria-label={t('sessionBuilder.editSessionAria')}
      >
        <div className={styles.sessionInfoEditGrid}>
          <Input
            id="edit-session-name"
            label={t('sessionBuilder.sessionName')}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder={t('sessionBuilder.sessionNamePlaceholderShort')}
          />
          <Input
            id="edit-session-date"
            label={t('sessionBuilder.sessionDateTime')}
            type="datetime-local"
            value={editDateTime}
            onChange={(e) => setEditDateTime(e.target.value)}
            step="60"
          />
          <label className={styles.contextField} htmlFor="edit-flow-mode">
            <span>{t('sessionBuilder.progressionMode')}</span>
            <select
              id="edit-flow-mode"
              className={styles.sessionInfoInput}
              value={editFlowMode}
              onChange={(e) => setEditFlowMode(e.target.value)}
            >
              <option value="manual">{t('sessionBuilder.manualModeOption')}</option>
              <option value="auto">{t('sessionBuilder.autoModeOption')}</option>
            </select>
          </label>
        </div>
        <div className={styles.creationGrid}>
          <Input
            id="edit-expected-participants"
            type="number"
            min="1"
            max="2147483647"
            step="1"
            label={t('sessionBuilder.expectedCount')}
            value={editExpectedCount}
            onChange={(event) => setEditExpectedCount(event.target.value)}
            hint={t('sessionBuilder.expectedCountHint')}
            error={
              isValidExpectedCount(editExpectedCount)
                ? ''
                : t('sessionBuilder.expectedCountInvalid')
            }
          />
          {renderObjectiveField(editObjective, setEditObjective, 'edit-session-objective')}
        </div>

        <div className={styles.sessionInfoParticipantsBlock}>
          <div className={styles.creationSectionHeader}>
            <div>
              <h2>{t('sessionBuilder.assignParticipants')}</h2>
            </div>
            <span className={styles.creationParticipantsCount}>
              {t('sessionBuilder.selectedCount', { count: editParticipantIds.length })}
            </span>
          </div>

          <ParticipantAssigner
            isLoading={isSavingSessionInfo}
            selectedIds={editParticipantIds}
            onSelectionChange={setEditParticipantIds}
            embedded
            hideActions
            title=""
            subtitle=""
          />
        </div>

        <div className={styles.sessionInfoEditActions}>
          <Button onClick={handleSaveSessionInfo} disabled={isSavingSessionInfo}>
            {isSavingSessionInfo ? t('sessionBuilder.saving') : t('sessionBuilder.save')}
          </Button>
          <Button variant="secondary" onClick={() => setIsEditingSessionInfo(false)}>
            {t('sessionBuilder.cancel')}
          </Button>
        </div>
      </section>
    </Modal>
  );
}
