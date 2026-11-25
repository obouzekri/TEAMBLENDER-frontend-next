"use client";

import { Button, Input } from '@/components/ui';
import { ChevronDown, UserPlus, Users } from 'lucide-react';
import Link from 'next/link';
import ParticipantAssigner from '@/components/SessionBuilder/ParticipantAssigner';
// Même ordre que SessionBuilder.js : les deux modules stylent les mêmes éléments, l'ordre fixe la cascade.
import styles from '@/app/session-builder/SessionBuilder.module.css';
import creationStyles from '@/app/session-builder/CreationForm.module.css';
import { isValidExpectedCount } from '@/lib/sessionProgram.mjs';

// Écran de création d’une session : rendu seul, état et actions restent dans SessionBuilder.
export default function SessionCreationForm({
  availableParticipantsCount,
  canCreateSessionNow,
  dateError,
  draftParticipantIds,
  expectedCount,
  flowMode,
  handleCreateSession,
  handleParticipantSelectionFeedback,
  handleParticipantsLoaded,
  isCreatingSession,
  minSessionDateTime,
  nameError,
  objective,
  renderObjectiveField,
  sessionDateTime,
  sessionName,
  setCreationTouched,
  setDraftParticipantIds,
  setExpectedCount,
  setFlowMode,
  setMinSessionDateTime,
  setObjective,
  setSessionDateTime,
  setSessionName,
  t,
  toDateTimeLocalValue,
  withLocalePath,
}) {
  return (
    <main className={creationStyles.page}>
      <div className={creationStyles.container}>
        <h1 className={creationStyles.title}>{t('sessionBuilder.creationTitle')}</h1>
        <p id="creation-intro" className={creationStyles.intro}>
          {t('sessionBuilder.creationIntro')}
        </p>
        <form
          id="create-session-form"
          onSubmit={handleCreateSession}
          className={creationStyles.form}
        >
          <section className={creationStyles.section} aria-labelledby="creation-info-heading">
            <h2 id="creation-info-heading">{t('sessionBuilder.creationInformation')}</h2>

            <Input
              id="session-name"
              label={`${t('sessionBuilder.sessionName')} ${t('sessionBuilder.requiredAsterisk')}`}
              value={sessionName}
              onChange={(e) => {
                setSessionName(e.target.value);
                setCreationTouched((prev) => ({ ...prev, sessionName: true }));
              }}
              onBlur={() => setCreationTouched((prev) => ({ ...prev, sessionName: true }))}
              placeholder={t('sessionBuilder.sessionNamePlaceholder')}
              autoFocus
              required
              error={nameError}
              aria-invalid={Boolean(nameError)}
            />
            <div className={creationStyles.grid}>
              <Input
                id="session-datetime"
                label={t('sessionBuilder.sessionDateTime')}
                type="datetime-local"
                value={sessionDateTime}
                onChange={(e) => {
                  setSessionDateTime(e.target.value);
                  setCreationTouched((prev) => ({ ...prev, sessionDateTime: true }));
                }}
                onBlur={() =>
                  setCreationTouched((prev) => ({ ...prev, sessionDateTime: true }))
                }
                step="60"
                min={minSessionDateTime || undefined}
                onFocus={() => setMinSessionDateTime(toDateTimeLocalValue(new Date()))}
                inputClassName={`${creationStyles.dateInput} ${
                  sessionDateTime ? '' : creationStyles.dateInputEmpty
                }`}
                error={dateError}
                aria-invalid={Boolean(dateError)}
              />
              <Input
                id="expected-participants"
                type="number"
                min="1"
                max="2147483647"
                step="1"
                label={t('sessionBuilder.creationExpectedCount')}
                value={expectedCount}
                onChange={(event) => setExpectedCount(event.target.value)}
                placeholder={t('sessionBuilder.expectedCountPlaceholder')}
                hint={t('sessionBuilder.expectedCountHint')}
                error={
                  isValidExpectedCount(expectedCount)
                    ? ''
                    : t('sessionBuilder.expectedCountInvalid')
                }
              />
            </div>
          </section>

          {renderObjectiveField(objective, setObjective, 'session-objective', true)}

          <section className={creationStyles.section} aria-labelledby="creation-flow-heading">
            <h2 id="creation-flow-heading">
              {t('sessionBuilder.creationFlow')}{' '}
              <span className={creationStyles.headingHint}>
                ({t('sessionBuilder.progressionMode')})
              </span>
            </h2>
            <fieldset
              className={creationStyles.flow}
              aria-labelledby="creation-flow-heading"
            >
              <label className={creationStyles.flowOption}>
                <input
                  type="radio"
                  name="flowMode"
                  value="manual"
                  checked={flowMode === 'manual'}
                  onChange={() => setFlowMode('manual')}
                />
                <span>
                  <strong>{t('sessionBuilder.manual')}</strong>
                  <small>{t('sessionBuilder.creationManualHint')}</small>
                </span>
              </label>
              <label className={creationStyles.flowOption}>
                <input
                  type="radio"
                  name="flowMode"
                  value="auto"
                  checked={flowMode === 'auto'}
                  onChange={() => setFlowMode('auto')}
                />
                <span>
                  <strong>{t('sessionBuilder.automatic')}</strong>
                  <small>{t('sessionBuilder.creationAutomaticHint')}</small>
                </span>
              </label>
            </fieldset>
          </section>

          <section
            className={creationStyles.section}
            aria-labelledby="creation-participants-heading"
          >
            <h2 id="creation-participants-heading">
              {t('sessionBuilder.creationParticipants')}{' '}
              <span className={creationStyles.headingHint}>
                ({t('sessionBuilder.optionalLabel')})
              </span>
            </h2>

            <div className={creationStyles.notice}>
              <Users size={20} aria-hidden="true" />
              <p>{t('sessionBuilder.creationParticipantsHint')}</p>
            </div>
            <details
              className={`${styles.participantsDisclosure} ${creationStyles.disclosure}`}
            >
              <summary>
                <span className={creationStyles.disclosureLabel}>
                  <UserPlus size={18} aria-hidden="true" />
                  {t('sessionBuilder.prepareAhead')}
                </span>
                {draftParticipantIds.length > 0 ? (
                  <span className={creationStyles.disclosureCount}>
                    {t('sessionBuilder.selectedCount', { count: draftParticipantIds.length })}
                  </span>
                ) : null}
                <ChevronDown
                  className={creationStyles.disclosureChevron}
                  size={18}
                  aria-hidden="true"
                />
              </summary>
              <p>{t('sessionBuilder.prepareAheadHint')}</p>
              <p>
                {availableParticipantsCount === 0
                  ? t('sessionBuilder.noAvailableProfiles')
                  : t('sessionBuilder.participantsAvailable', {
                      count: availableParticipantsCount,
                    })}
              </p>
              <ParticipantAssigner
                isLoading={isCreatingSession}
                selectedIds={draftParticipantIds}
                onSelectionChange={(ids) => {
                  setDraftParticipantIds(ids);
                  setCreationTouched((prev) => ({ ...prev, participants: true }));
                }}
                onParticipantsLoaded={handleParticipantsLoaded}
                onSelectionFeedback={handleParticipantSelectionFeedback}
                embedded
                hideActions
                showSelectionLimitNotice={false}
                title=""
                subtitle=""
              />

              {availableParticipantsCount === 0 ? (
                <div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      window.location.assign(withLocalePath('/home#home-participants-block'))
                    }
                  >
                    {t('sessionBuilder.createParticipantCta')}
                  </Button>
                </div>
              ) : null}
            </details>
          </section>

          <footer className={creationStyles.actions}>
            <Link
              href={withLocalePath('/home')}
              className={creationStyles.cancel}
              aria-disabled={isCreatingSession || undefined}
              onClick={(event) => {
                if (isCreatingSession) event.preventDefault();
              }}
            >
              {t('sessionBuilder.cancel')}
            </Link>
            <Button
              type="submit"
              form="create-session-form"
              className={creationStyles.submit}
              aria-describedby="creation-intro"
              disabled={!canCreateSessionNow}
              title={
                !canCreateSessionNow
                  ? t('sessionBuilder.sessionNameRequired')
                  : t('sessionBuilder.createSession')
              }
            >
              {isCreatingSession
                ? t('sessionBuilder.creating')
                : t('sessionBuilder.createSession')}
            </Button>
          </footer>
        </form>
      </div>
    </main>
  );
}
