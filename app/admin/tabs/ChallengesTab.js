"use client";

import {
  CHALLENGE_SOURCE_OPTION_LABELS,
  CHALLENGE_STATUS_OPTION_LABELS,
  CHALLENGE_TYPE_OPTION_LABELS,
  MAX_CHALLENGE_OBJECTIVES,
} from '@/lib/admin/constants';
import Image from 'next/image';
import {
  ensureCopuzzleConfig,
  getChallengeStatusLabel,
  getChallengeTypeLabel,
  getCopuzzleDefaultImages,
  getCopuzzleImageSrc,
  getEscapeRoomE5ImageSrc,
  getLocalizedLabel,
  normalizeObjectivesInput,
  renderUploadInputLabel,
  toggleObjectiveSelection,
} from '@/lib/admin/utils';
import { resolveChallengePlayerRange } from '@/lib/challenges/playerRange';

// Onglet « challenges » de la console admin : rendu seul, l'état et les actions restent dans AdminClient.
export default function ChallengesTab({
  beginEditChallenge,
  busyDeleteKey,
  busySaveKey,
  challengeCategoryOptions,
  challengeImageUploadBusy,
  challengeImageUploadError,
  challengeObjectiveOptions,
  challengeQuery,
  challenges,
  editingChallenge,
  filteredChallenges,
  handleDeleteChallenge,
  handleUploadCopuzzleDefaultImage,
  handleUploadEscapeRoomImage,
  locale,
  newChallenge,
  newChallengeMessage,
  setChallengeImageUploadError,
  setChallengeQuery,
  setEditingChallenge,
  setNewChallenge,
  setNewChallengeMessage,
  setShowNewChallengeForm,
  showNewChallengeForm,
  submitEditChallenge,
  submitNewChallenge,
  t,
}) {
  return (
    <div>
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Challenges</h1>
          <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '14px' }}>{t('adminConsole.manageTheAvailableChallengeCatalog')}</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setEditingChallenge(null);
            setChallengeImageUploadError('');
            setNewChallengeMessage('');
            setShowNewChallengeForm((current) => !current);
          }}
        >
          {showNewChallengeForm ? t('adminConsole.closeForm') : t('adminConsole.addChallenge')}
        </button>
      </div>

      <div style={{ display: 'grid', gap: '20px' }}>
        {showNewChallengeForm ? (
          <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0, marginBottom: '12px' }}>{t('adminConsole.addChallenge')}</h2>
            <form className="auth-form" onSubmit={submitNewChallenge}>
              <label>{t('adminConsole.name')}<input value={newChallenge.name} onChange={(e) => setNewChallenge((p) => ({ ...p, name: e.target.value }))} required /></label>
              <label>{t('adminConsole.type')}
                <select value={newChallenge.type} onChange={(e) => setNewChallenge((p) => ({ ...p, type: e.target.value }))}>
                  <option value="individuel">{getLocalizedLabel(CHALLENGE_TYPE_OPTION_LABELS.individuel, locale)}</option>
                  <option value="equipe">{getLocalizedLabel(CHALLENGE_TYPE_OPTION_LABELS.equipe, locale)}</option>
                </select>
              </label>
              <label>{t('adminConsole.status')}
                <select value={newChallenge.status} onChange={(e) => setNewChallenge((p) => ({ ...p, status: e.target.value }))}>
                  <option value="actif">{getLocalizedLabel(CHALLENGE_STATUS_OPTION_LABELS.actif, locale)}</option>
                  <option value="brouillon">{getLocalizedLabel(CHALLENGE_STATUS_OPTION_LABELS.brouillon, locale)}</option>
                  <option value="archive">{getLocalizedLabel(CHALLENGE_STATUS_OPTION_LABELS.archive, locale)}</option>
                </select>
              </label>
              <label>{t('adminConsole.source')}
                <select value={newChallenge.source} onChange={(e) => setNewChallenge((p) => ({ ...p, source: e.target.value }))}>
                  <option value="local">{getLocalizedLabel(CHALLENGE_SOURCE_OPTION_LABELS.local, locale)}</option>
                  <option value="external">{getLocalizedLabel(CHALLENGE_SOURCE_OPTION_LABELS.external, locale)}</option>
                </select>
              </label>
              <label>{t('adminConsole.category')}
                <select value={newChallenge.category} onChange={(e) => setNewChallenge((p) => ({ ...p, category: e.target.value }))}>
                  <option value="">{t('adminConsole.select')}</option>
                  {challengeCategoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label>{t('adminConsole.objectives')}
                <div style={{ display: 'grid', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '13px', color: 'var(--color-muted, #6b7280)' }}>
                    <span>{t('adminConsole.chooseUpToMaxChallengeObjectives', { MAX_CHALLENGE_OBJECTIVES })}</span>
                    <strong>{normalizeObjectivesInput(newChallenge.objectives).length}/{MAX_CHALLENGE_OBJECTIVES}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {challengeObjectiveOptions.map((option) => {
                      const selectedObjectives = normalizeObjectivesInput(newChallenge.objectives);
                      const isSelected = selectedObjectives.includes(option.value);
                      const limitReached = selectedObjectives.length >= MAX_CHALLENGE_OBJECTIVES;
                      const disabled = !isSelected && limitReached;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className="admin-objective-chip"
                          aria-pressed={isSelected}
                          onClick={() => setNewChallenge((p) => ({ ...p, objectives: toggleObjectiveSelection(p.objectives, option.value) }))}
                          disabled={disabled}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                  {normalizeObjectivesInput(newChallenge.objectives).length >= MAX_CHALLENGE_OBJECTIVES ? (
                      <p className="session-meta" style={{ margin: 0 }}>{t('adminConsole.limitReachedRemoveOneObjectiveTo')}</p>
                  ) : null}
                </div>
              </label>
              <label>{t('adminConsole.duration')}<input value={newChallenge.duration} onChange={(e) => setNewChallenge((p) => ({ ...p, duration: e.target.value }))} /></label>
              <label>{t('adminConsole.engineKey')}
                <input list="known-engine-keys" value={newChallenge.engine_key} onChange={(e) => setNewChallenge((p) => ({ ...p, engine_key: e.target.value }))} />
              </label>
              <label>{t('adminConsole.description')}<textarea rows={4} value={newChallenge.description} onChange={(e) => setNewChallenge((p) => ({ ...p, description: e.target.value }))} /></label>
              <div style={{ border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '8px', padding: '12px', display: 'grid', gap: '10px' }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{t('adminConsole.challengeRules')}</p>
                <p className="session-meta" style={{ margin: 0 }}>{t('adminConsole.thisContentFeedsTheBriefShown')}</p>
                <label>{t('adminConsole.missionBrief')}
                  <textarea rows={3} value={newChallenge.rules_objective} onChange={(e) => setNewChallenge((p) => ({ ...p, rules_objective: e.target.value }))} placeholder={t('adminConsole.describeTheMainChallengeObjective')} />
                </label>
                <label>{t('adminConsole.facilitatorInstructions1Line1Rule')}
                  <textarea rows={4} value={newChallenge.rules_facilitator} onChange={(e) => setNewChallenge((p) => ({ ...p, rules_facilitator: e.target.value }))} placeholder={t('adminConsole.frameTheChallenge10StartThe')} />
                </label>
                <label>{t('adminConsole.participantInstructions1Line1Rule')}
                  <textarea rows={4} value={newChallenge.rules_participant} onChange={(e) => setNewChallenge((p) => ({ ...p, rules_participant: e.target.value }))} placeholder={t('adminConsole.listenToTheBrief10Collaborate')} />
                </label>
                <label>{t('adminConsole.closingNote')}
                  <textarea rows={2} value={newChallenge.rules_footnote} onChange={(e) => setNewChallenge((p) => ({ ...p, rules_footnote: e.target.value }))} placeholder={t('adminConsole.optionalSummaryMessage')} />
                </label>
                <div style={{ borderTop: '1px dashed var(--color-border, #e5e7eb)', paddingTop: '10px', display: 'grid', gap: '10px' }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>{t('adminConsole.playersMinRecommendedMax')}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <label>Min
                      <input type="number" min="1" value={newChallenge.player_min} onChange={(e) => setNewChallenge((p) => ({ ...p, player_min: e.target.value }))} />
                    </label>
                    <label>{t('adminConsole.recommended')}
                      <input type="number" min="1" value={newChallenge.player_recommended} onChange={(e) => setNewChallenge((p) => ({ ...p, player_recommended: e.target.value }))} />
                    </label>
                    <label>Max
                      <input type="number" min="1" value={newChallenge.player_max} onChange={(e) => setNewChallenge((p) => ({ ...p, player_max: e.target.value }))} />
                    </label>
                  </div>
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={busySaveKey === 'create:challenge'}>
                {busySaveKey === 'create:challenge' ? t('adminConsole.creating') : t('adminConsole.createChallenge')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowNewChallengeForm(false);
                  setNewChallengeMessage('');
                }}
              >
                {t('adminConsole.cancel')}
              </button>
            </form>
            {newChallengeMessage ? <p className="session-meta" style={{ marginTop: '8px' }}>{newChallengeMessage}</p> : null}
          </div>
        ) : null}

        {editingChallenge ? (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--modal-scrim, rgba(0,0,0,0.45))', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 16px' }}
            onClick={(e) => { if (e.target === e.currentTarget) { setEditingChallenge(null); setChallengeImageUploadError(''); } }}
          >
            <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-primary, #4f46e5)', borderRadius: '12px', padding: '24px 28px', width: '100%', maxWidth: '640px', position: 'relative', marginBottom: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>{t('adminConsole.editChallenge')}</h2>
                <button type="button" onClick={() => { setEditingChallenge(null); setChallengeImageUploadError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--color-muted, #6b7280)', padding: '2px 8px', lineHeight: 1 }} aria-label={t('adminConsole.closeWindow')}>✕</button>
              </div>
            <form className="auth-form" onSubmit={submitEditChallenge}>
                <label>{t('adminConsole.name')}<input value={editingChallenge.name} onChange={(e) => setEditingChallenge((p) => ({ ...p, name: e.target.value }))} required /></label>
                <label>{t('adminConsole.type')}
                  <select value={editingChallenge.type} onChange={(e) => setEditingChallenge((p) => ({ ...p, type: e.target.value }))}>
                    <option value="individuel">{getChallengeTypeLabel('individuel', locale)}</option>
                    <option value="equipe">{getChallengeTypeLabel('equipe', locale)}</option>
                  </select>
                </label>
                <label>{t('adminConsole.status')}
                  <select value={editingChallenge.status} onChange={(e) => setEditingChallenge((p) => ({ ...p, status: e.target.value }))}>
                    <option value="actif">{getChallengeStatusLabel('actif', locale)}</option>
                    <option value="brouillon">{getChallengeStatusLabel('brouillon', locale)}</option>
                    <option value="archive">{getChallengeStatusLabel('archive', locale)}</option>
                  </select>
                </label>
                <label>{t('adminConsole.category')}
                  <select value={editingChallenge.category} onChange={(e) => setEditingChallenge((p) => ({ ...p, category: e.target.value }))}>
                    <option value="">{t('adminConsole.select')}</option>
                    {challengeCategoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label>{t('adminConsole.objectives')}
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '13px', color: 'var(--color-muted, #6b7280)' }}>
                      <span>{t('adminConsole.chooseUpToMaxChallengeObjectives', { MAX_CHALLENGE_OBJECTIVES })}</span>
                      <strong>{normalizeObjectivesInput(editingChallenge.objectives).length}/{MAX_CHALLENGE_OBJECTIVES}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {challengeObjectiveOptions.map((option) => {
                        const selectedObjectives = normalizeObjectivesInput(editingChallenge.objectives);
                        const isSelected = selectedObjectives.includes(option.value);
                        const limitReached = selectedObjectives.length >= MAX_CHALLENGE_OBJECTIVES;
                        const disabled = !isSelected && limitReached;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            className="admin-objective-chip"
                            aria-pressed={isSelected}
                            onClick={() => setEditingChallenge((p) => ({ ...p, objectives: toggleObjectiveSelection(p.objectives, option.value) }))}
                            disabled={disabled}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                    {normalizeObjectivesInput(editingChallenge.objectives).length >= MAX_CHALLENGE_OBJECTIVES ? (
                      <p className="session-meta" style={{ margin: 0 }}>{t('adminConsole.limitReachedRemoveOneObjectiveTo')}</p>
                    ) : null}
                  </div>
                </label>
                <label>{t('adminConsole.duration')}<input value={editingChallenge.duration} onChange={(e) => setEditingChallenge((p) => ({ ...p, duration: e.target.value }))} /></label>
                <label>{t('adminConsole.engineKey')}
                  <input list="known-engine-keys" value={editingChallenge.engine_key} onChange={(e) => setEditingChallenge((p) => ({ ...p, engine_key: e.target.value }))} />
                </label>
                <label>{t('adminConsole.description')}<textarea rows={4} value={editingChallenge.description} onChange={(e) => setEditingChallenge((p) => ({ ...p, description: e.target.value }))} /></label>
                <div style={{ border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '8px', padding: '12px', display: 'grid', gap: '10px' }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>{t('adminConsole.challengeRules')}</p>
                  <p className="session-meta" style={{ margin: 0 }}>{t('adminConsole.thisContentFeedsTheBriefShown')}</p>
                  <label>{t('adminConsole.missionBrief')}
                    <textarea rows={3} value={editingChallenge.rules_objective || ''} onChange={(e) => setEditingChallenge((p) => ({ ...p, rules_objective: e.target.value }))} placeholder={t('adminConsole.describeTheMainChallengeObjective')} />
                  </label>
                  <label>{t('adminConsole.facilitatorInstructions1Line1Rule')}
                    <textarea rows={4} value={editingChallenge.rules_facilitator || ''} onChange={(e) => setEditingChallenge((p) => ({ ...p, rules_facilitator: e.target.value }))} placeholder={t('adminConsole.frameTheChallenge10StartThe')} />
                  </label>
                  <label>{t('adminConsole.participantInstructions1Line1Rule')}
                    <textarea rows={4} value={editingChallenge.rules_participant || ''} onChange={(e) => setEditingChallenge((p) => ({ ...p, rules_participant: e.target.value }))} placeholder={t('adminConsole.listenToTheBrief10Collaborate')} />
                  </label>
                  <label>{t('adminConsole.closingNote')}
                    <textarea rows={2} value={editingChallenge.rules_footnote || ''} onChange={(e) => setEditingChallenge((p) => ({ ...p, rules_footnote: e.target.value }))} placeholder={t('adminConsole.optionalSummaryMessage')} />
                  </label>
                  <div style={{ borderTop: '1px dashed var(--color-border, #e5e7eb)', paddingTop: '10px', display: 'grid', gap: '10px' }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>{t('adminConsole.playersMinRecommendedMax')}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                      <label>Min
                        <input
                          type="number"
                          min="1"
                          value={editingChallenge.player_min || ''}
                          onChange={(e) => setEditingChallenge((p) => ({ ...p, player_min: e.target.value }))}
                        />
                      </label>
                      <label>{t('adminConsole.recommended')}
                        <input
                          type="number"
                          min="1"
                          value={editingChallenge.player_recommended || ''}
                          onChange={(e) => setEditingChallenge((p) => ({ ...p, player_recommended: e.target.value }))}
                        />
                      </label>
                      <label>Max
                        <input
                          type="number"
                          min="1"
                          value={editingChallenge.player_max || ''}
                          onChange={(e) => setEditingChallenge((p) => ({ ...p, player_max: e.target.value }))}
                        />
                      </label>
                    </div>
                  </div>
                </div>
                {(editingChallenge.engine_key || '').toLowerCase() === 'escape_room_v1' ? (
                  <div
                    style={{
                      border: '1px solid var(--color-border, #cbd5e1)',
                      borderRadius: '14px',
                      padding: '14px',
                      display: 'grid',
                      gap: '10px',
                      background: 'var(--color-surface, #fff)',
                      boxShadow: '0 10px 24px -20px rgba(15, 23, 42, 0.55)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                      <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-strong, #0f172a)' }}>{t('adminConsole.puzzle5ImageSecretRoom')}</p>
                      <span style={{ fontSize: '12px', color: 'var(--color-muted, #334155)', fontWeight: 600 }}>{t('adminConsole.persistentStorageEnabled')}</span>
                    </div>
                    <p className="session-meta" style={{ margin: 0 }}>{t('adminConsole.thisImageIsUsedInThe')}</p>
                    <label style={{ display: 'inline-flex', width: 'fit-content' }}>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handleUploadEscapeRoomImage}
                        disabled={challengeImageUploadBusy}
                        style={{ position: 'absolute', opacity: 0, width: '1px', height: '1px', pointerEvents: 'none' }}
                      />
                      {renderUploadInputLabel({ locale, busy: challengeImageUploadBusy })}
                    </label>
                    {challengeImageUploadError ? (
                      <p className="session-meta" style={{ margin: 0, color: '#b91c1c', fontWeight: 600 }}>{challengeImageUploadError}</p>
                    ) : null}
                    {getEscapeRoomE5ImageSrc(editingChallenge.engine_config) ? (
                      <div style={{ border: '1px solid var(--color-border, #dbe4f0)', borderRadius: '12px', padding: '8px', background: 'var(--color-surface, #f8fafc)' }}>
                        <Image
                          src={getEscapeRoomE5ImageSrc(editingChallenge.engine_config)}
                          alt={t('adminConsole.puzzle5Preview')}
                          unoptimized
                          width={640}
                          height={360}
                          loading="lazy"
                          style={{ display: 'block', width: '100%', maxHeight: '190px', objectFit: 'contain', borderRadius: '8px' }}
                        />
                      </div>
                    ) : (
                      <p className="session-meta" style={{ margin: 0 }}>{t('adminConsole.noImageConfiguredForE5')}</p>
                    )}
                  </div>
                ) : null}
                {(editingChallenge.engine_key || '').toLowerCase() === 'copuzzle_live_v1' ? (
                  <div style={{ border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '8px', padding: '12px', display: 'grid', gap: '10px' }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>{t('adminConsole.copuzzleConfiguration3AdminReferenceImages')}</p>
                    <p className="session-meta" style={{ margin: 0 }}>
                      {t('adminConsole.defineUpTo3ReferenceImages')}
                    </p>

                    {getCopuzzleDefaultImages(editingChallenge.engine_config).map((imageItem, imageIndex) => {
                      const slotIndex = imageIndex + 1;
                      return (
                        <div
                          key={imageItem.id || `copuzzle-default-${slotIndex}`}
                          style={{
                            border: '1px solid var(--color-border, #dbe4f0)',
                            borderRadius: '12px',
                            padding: '12px',
                            display: 'grid',
                            gap: '9px',
                            background: 'var(--color-surface, #fff)',
                          }}
                        >
                          <p style={{ margin: 0, fontWeight: 600 }}>{t('adminConsole.referenceImageSlotindex', { slotIndex })}</p>

                          <label>{t('adminConsole.title')}
                            <input
                              value={String(imageItem.title || '')}
                              onChange={(e) => {
                                const nextTitle = String(e.target.value || '').trimStart();
                                setEditingChallenge((prev) => {
                                  if (!prev) return prev;
                                  const currentConfig = ensureCopuzzleConfig(prev.engine_config);
                                  const defaultImages = getCopuzzleDefaultImages(currentConfig).map((item) => ({ ...item }));
                                  defaultImages[imageIndex] = {
                                    ...(defaultImages[imageIndex] || {}),
                                    id: defaultImages[imageIndex]?.id || `default_${slotIndex}`,
                                    src: String(defaultImages[imageIndex]?.src || imageItem.src || '').trim(),
                                    title: nextTitle || `Image ${slotIndex}`,
                                  };

                                  return {
                                    ...prev,
                                    engine_config: {
                                      ...currentConfig,
                                      default_images: defaultImages,
                                    },
                                  };
                                });
                              }}
                              placeholder={`Image ${slotIndex}`}
                            />
                          </label>

                          <label>{t('adminConsole.imageUrl')}
                            <input
                              value={String(imageItem.src || '')}
                              onChange={(e) => {
                                const nextSrc = String(e.target.value || '').trim();
                                setEditingChallenge((prev) => {
                                  if (!prev) return prev;
                                  const currentConfig = ensureCopuzzleConfig(prev.engine_config);
                                  const defaultImages = getCopuzzleDefaultImages(currentConfig).map((item) => ({ ...item }));
                                  defaultImages[imageIndex] = {
                                    ...(defaultImages[imageIndex] || {}),
                                    id: defaultImages[imageIndex]?.id || `default_${slotIndex}`,
                                    title: String(defaultImages[imageIndex]?.title || imageItem.title || `Image ${slotIndex}`),
                                    src: nextSrc,
                                  };
                                  const selectedDefaultImageId = String(currentConfig.default_image_id || defaultImages[0]?.id || '').trim();
                                  const selectedDefault = defaultImages.find((item) => item.id === selectedDefaultImageId) || defaultImages[0] || null;
                                  return {
                                    ...prev,
                                    engine_config: {
                                      ...currentConfig,
                                      default_images: defaultImages,
                                      image_url: String(selectedDefault?.src || nextSrc),
                                      image: {
                                        ...(currentConfig.image || {}),
                                        src: String(selectedDefault?.src || nextSrc),
                                      },
                                    },
                                  };
                                });
                              }}
                              placeholder={t('adminConsole.httpsOrCopuzzleDefaultBlueSvg')}
                            />
                          </label>

                          <label style={{ display: 'inline-flex', width: 'fit-content', gap: '8px' }}>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg"
                              onChange={(event) => handleUploadCopuzzleDefaultImage(event, imageIndex)}
                              disabled={challengeImageUploadBusy}
                              style={{ position: 'absolute', opacity: 0, width: '1px', height: '1px', pointerEvents: 'none' }}
                            />
                            {renderUploadInputLabel({ locale, busy: challengeImageUploadBusy })}
                          </label>

                          {String(imageItem.src || '').trim() ? (
                            <div style={{ border: '1px solid var(--color-border, #dbe4f0)', borderRadius: '10px', padding: '7px', background: 'var(--color-surface, #f8fafc)' }}>
                              <Image
                                src={String(imageItem.src || '').trim()}
                                alt={t('adminConsole.imagePreviewSlotindex', { slotIndex })}
                                unoptimized
                                width={640}
                                height={360}
                                loading="lazy"
                                style={{ display: 'block', width: '100%', maxHeight: '140px', objectFit: 'contain', borderRadius: '7px' }}
                              />
                            </div>
                          ) : null}

                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="radio"
                              name="copuzzle-default-image"
                              checked={String(ensureCopuzzleConfig(editingChallenge.engine_config).default_image_id || '') === String(imageItem.id || '')}
                              onChange={() => {
                                setEditingChallenge((prev) => {
                                  if (!prev) return prev;
                                  const currentConfig = ensureCopuzzleConfig(prev.engine_config);
                                  const defaultImages = getCopuzzleDefaultImages(currentConfig);
                                  const selected = defaultImages.find((item) => item.id === imageItem.id) || defaultImages[0] || null;
                                  return {
                                    ...prev,
                                    engine_config: {
                                      ...currentConfig,
                                      default_image_id: String(imageItem.id || selected?.id || ''),
                                      image_url: String(selected?.src || currentConfig.image_url || ''),
                                      image: {
                                        ...(currentConfig.image || {}),
                                        src: String(selected?.src || currentConfig.image?.src || currentConfig.image_url || ''),
                                      },
                                    },
                                  };
                                });
                              }}
                            />
                            {t('adminConsole.defaultSelectedImage')}
                          </label>
                        </div>
                      );
                    })}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <label>{t('adminConsole.gridRows')}
                        <input
                          type="number"
                          min="2"
                          max="16"
                          value={ensureCopuzzleConfig(editingChallenge.engine_config).grid.rows}
                          onChange={(e) => {
                            const value = Number(e.target.value || 4);
                            setEditingChallenge((prev) => {
                              if (!prev) return prev;
                              const currentConfig = ensureCopuzzleConfig(prev.engine_config);
                              return {
                                ...prev,
                                engine_config: {
                                  ...currentConfig,
                                  grid: {
                                    ...(currentConfig.grid || {}),
                                    rows: value,
                                  },
                                },
                              };
                            });
                          }}
                        />
                      </label>
                      <label>{t('adminConsole.gridCols')}
                        <input
                          type="number"
                          min="2"
                          max="16"
                          value={ensureCopuzzleConfig(editingChallenge.engine_config).grid.cols}
                          onChange={(e) => {
                            const value = Number(e.target.value || 4);
                            setEditingChallenge((prev) => {
                              if (!prev) return prev;
                              const currentConfig = ensureCopuzzleConfig(prev.engine_config);
                              return {
                                ...prev,
                                engine_config: {
                                  ...currentConfig,
                                  grid: {
                                    ...(currentConfig.grid || {}),
                                    cols: value,
                                  },
                                },
                              };
                            });
                          }}
                        />
                      </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <label>{t('adminConsole.timerSeconds')}
                        <input
                          type="number"
                          min="30"
                          max="7200"
                          value={ensureCopuzzleConfig(editingChallenge.engine_config).timer.duration_seconds}
                          onChange={(e) => {
                            const value = Number(e.target.value || 1200);
                            setEditingChallenge((prev) => {
                              if (!prev) return prev;
                              const currentConfig = ensureCopuzzleConfig(prev.engine_config);
                              return {
                                ...prev,
                                engine_config: {
                                  ...currentConfig,
                                  timer: {
                                    ...(currentConfig.timer || {}),
                                    duration_seconds: value,
                                  },
                                },
                              };
                            });
                          }}
                        />
                      </label>
                      <label>{t('adminConsole.warningThresholdSeconds')}
                        <input
                          type="number"
                          min="10"
                          max="600"
                          value={ensureCopuzzleConfig(editingChallenge.engine_config).timer.warning_threshold_seconds}
                          onChange={(e) => {
                            const value = Number(e.target.value || 60);
                            setEditingChallenge((prev) => {
                              if (!prev) return prev;
                              const currentConfig = ensureCopuzzleConfig(prev.engine_config);
                              return {
                                ...prev,
                                engine_config: {
                                  ...currentConfig,
                                  timer: {
                                    ...(currentConfig.timer || {}),
                                    warning_threshold_seconds: value,
                                  },
                                },
                              };
                            });
                          }}
                        />
                      </label>
                    </div>

                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={ensureCopuzzleConfig(editingChallenge.engine_config).timer.enabled}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setEditingChallenge((prev) => {
                            if (!prev) return prev;
                            const currentConfig = ensureCopuzzleConfig(prev.engine_config);
                            return {
                              ...prev,
                              engine_config: {
                                ...currentConfig,
                                timer: {
                                  ...(currentConfig.timer || {}),
                                  enabled: checked,
                                },
                              },
                            };
                          });
                        }}
                      />
                      {t('adminConsole.timerEnabled')}
                    </label>

                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={ensureCopuzzleConfig(editingChallenge.engine_config).chat.enabled}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setEditingChallenge((prev) => {
                            if (!prev) return prev;
                            const currentConfig = ensureCopuzzleConfig(prev.engine_config);
                            return {
                              ...prev,
                              engine_config: {
                                ...currentConfig,
                                chat: {
                                  ...(currentConfig.chat || {}),
                                  enabled: checked,
                                },
                              },
                            };
                          });
                        }}
                      />
                      {t('adminConsole.chatEnabled')}
                    </label>

                    {challengeImageUploadBusy ? (
                      <p className="session-meta" style={{ marginTop: '8px' }}>{t('adminConsole.uploadInProgress')}</p>
                    ) : null}
                    {challengeImageUploadError ? (
                      <p className="session-meta" style={{ marginTop: '8px', color: '#dc2626' }}>{challengeImageUploadError}</p>
                    ) : null}

                    <Image
                      src={getCopuzzleImageSrc(editingChallenge.engine_config)}
                      alt={t('adminConsole.copuzzlePreview')}
                      unoptimized
                      width={840}
                      height={840}
                      loading="lazy"
                      style={{ marginTop: '6px', maxWidth: '100%', maxHeight: '180px', objectFit: 'contain', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      onLoad={(e) => { e.currentTarget.style.display = 'block'; }}
                    />
                  </div>
                ) : null}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button type="submit" className="btn-primary" disabled={busySaveKey === `save:challenge:${editingChallenge.id}`}>{busySaveKey === `save:challenge:${editingChallenge.id}` ? t('adminConsole.saving') : t('adminConsole.save')}</button>
                  <button type="button" className="btn-secondary" onClick={() => { setEditingChallenge(null); setChallengeImageUploadError(''); }}>{t('adminConsole.cancel')}</button>
                </div>
            </form>
            </div>
          </div>
        ) : null}

        <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
              {t('adminConsole.list')} {challenges.length > 0 ? <span style={{ fontWeight: 400, color: 'var(--color-muted, #6b7280)', fontSize: '13px' }}>({filteredChallenges.length}/{challenges.length})</span> : null}
            </h2>
            <input
              type="search"
              className="inline-input"
              placeholder={t('adminConsole.search')}
              value={challengeQuery}
              onChange={(e) => setChallengeQuery(e.target.value)}
              style={{ width: 'min(360px, 100%)' }}
            />
          </div>
          <ul className="session-list" style={{ margin: 0 }}>
            {filteredChallenges.length === 0 ? <li className="list-empty">{t('adminConsole.noMatchingChallenge')}</li> : null}
            {filteredChallenges.map((c) => (
              <li key={String(c.id)} className="session-item" style={{ alignItems: 'center' }}>
                <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                  <p className="session-title">{c.name || c.title || `Challenge #${c.id}`}</p>
                  <p className="session-meta">{getChallengeTypeLabel(c.type, locale)} · {getChallengeStatusLabel(c.status, locale)} {c.engine_key ? `· ${c.engine_key}` : ''}</p>
                  {(() => {
                    const playerRange = resolveChallengePlayerRange(c);
                    if (!playerRange.hasRange) return null;
                    return (
                      <p className="session-meta" style={{ marginTop: '4px' }}>
                        ~{playerRange.recommended || '-'} {t('adminConsole.players')} · Min {playerRange.min || '-'} · Max {playerRange.max || '-'}
                      </p>
                    );
                  })()}
                </div>
                <div className="session-item-actions icon-only-actions" style={{ flexShrink: 0 }}>
                  <button
                    type="button"
                    className="icon-action-btn"
                    onClick={() => beginEditChallenge(c)}
                    title={t('adminConsole.edit')}
                    aria-label={t('adminConsole.editChallenge2')}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="icon-action-btn icon-action-danger"
                    onClick={() => handleDeleteChallenge(c)}
                    disabled={busyDeleteKey === `challenge:${c.id}`}
                    title={t('adminConsole.delete')}
                    aria-label={t('adminConsole.deleteChallenge')}
                  >
                    {busyDeleteKey === `challenge:${c.id}` ? '…' : '🗑'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
