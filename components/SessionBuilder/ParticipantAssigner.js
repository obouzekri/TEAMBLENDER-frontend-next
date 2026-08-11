'use client';

import styles from './ParticipantAssigner.module.css';
import { useState, useEffect, useMemo } from 'react';
import { getApiUrl } from '@/lib/config';
import { getAuthHeaders } from '@/lib/auth';
import useI18n from '@/lib/i18n/useI18n';

const MAX_PARTICIPANTS = 3;

export default function ParticipantAssigner({
  isLoading,
  onAssign,
  onCancel,
  selectedIds = null,
  onSelectionChange,
  onParticipantsLoaded,
  embedded = false,
  hideActions = false,
  title = 'Assign participants',
  subtitle = 'Select the participants who will join this session',
  onSelectionFeedback,
  onSelectionSummaryChange,
}) {
  const { t } = useI18n();
  const [participants, setParticipants] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  function getMemberDisplayName(member) {
    const first = String(member?.first_name || member?.firstname || '').trim();
    const last = String(member?.last_name || member?.lastname || '').trim();
    const full = `${first} ${last}`.trim();
    return full || String(member?.name || member?.email || 'Unnamed');
  }

  function getEmbeddedName(member) {
    const first = String(member?.first_name || member?.firstname || '').trim();
    const last = String(member?.last_name || member?.lastname || '').trim();
    const combined = `${last} ${first}`.trim();
    return combined || getMemberDisplayName(member);
  }

  function getInitials(member) {
    const first = String(member?.first_name || member?.firstname || '').trim();
    const last = String(member?.last_name || member?.lastname || '').trim();
    const source = `${first} ${last}`.trim() || String(member?.name || member?.email || 'U').trim();

    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'U';
  }

  useEffect(() => {
    if (!Array.isArray(selectedIds)) return;
    setSelected(selectedIds);
  }, [selectedIds]);

  useEffect(() => {
    setLoadingParticipants(true);
    fetch(getApiUrl('/participants'), {
      headers: getAuthHeaders(),
      credentials: 'include',
    })
      .then(async (res) => {
        const text = await res.text();
        let payload = {};
        try {
          payload = text ? JSON.parse(text) : {};
        } catch {
          payload = {};
        }

        if (!res.ok) throw new Error(payload.error || t('sessionBuilder.catalogUnavailableError'));
        return payload;
      })
      .then((data) => {
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.items)
            ? data.items
            : Array.isArray(data.data)
              ? data.data
              : [];
        setParticipants(list);
        if (typeof onParticipantsLoaded === 'function') {
          onParticipantsLoaded(list.length);
        }
      })
      .catch((err) => {
        console.warn('Participant loading error:', err.message);
        setParticipants([]);
        if (typeof onParticipantsLoaded === 'function') {
          onParticipantsLoaded(0);
        }
      })
      .finally(() => {
        setLoadingParticipants(false);
      });
  }, [onParticipantsLoaded]);

  const filteredParticipants = participants.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      getMemberDisplayName(p).toLowerCase().includes(term) ||
      String(p.email || '').toLowerCase().includes(term)
    );
  });

  const selectedIdsSet = useMemo(() => new Set(selected), [selected]);
  const selectedParticipants = useMemo(
    () => participants.filter((p) => selectedIdsSet.has(p.id)),
    [participants, selectedIdsSet]
  );

  useEffect(() => {
    if (typeof onSelectionSummaryChange !== 'function') return;
    onSelectionSummaryChange({
      selectedIds: selected,
      selectedParticipants,
      totalParticipants: participants.length,
      filteredParticipantsCount: filteredParticipants.length,
    });
  }, [filteredParticipants.length, onSelectionSummaryChange, participants.length, selected, selectedParticipants]);

  const announceSelection = (count) => {
    if (typeof onSelectionFeedback === 'function') {
      onSelectionFeedback(count);
    }
  };

  const toggleParticipant = (id) => {
    setSelected((prev) => {
      const alreadySelected = prev.includes(id);
      if (!alreadySelected && prev.length >= MAX_PARTICIPANTS) {
        const message = t('sessionBuilder.maxParticipantsReached', { count: MAX_PARTICIPANTS });
        if (typeof onSelectionFeedback === 'function') {
          onSelectionFeedback(message);
        }
        return prev;
      }

      const next = alreadySelected ? prev.filter((x) => x !== id) : [...prev, id];
      if (typeof onSelectionChange === 'function') {
        onSelectionChange(next);
      }
      announceSelection(next.length);
      return next;
    });
  };

  const selectAll = () => {
    const next = participants.map((p) => p.id);
    setSelected(next);
    if (typeof onSelectionChange === 'function') {
      onSelectionChange(next);
    }
    announceSelection(next.length);
  };

  const deselectAll = () => {
    setSelected([]);
    if (typeof onSelectionChange === 'function') {
      onSelectionChange([]);
    }
    announceSelection(0);
  };

  const handleAssign = () => {
    onAssign(selected);
  };

  const showHeader = Boolean(String(title || '').trim() || String(subtitle || '').trim());
  const canSelectAll = participants.length > 0 && selected.length < participants.length;
  const canDeselectAll = selected.length > 0;
  const hasSearch = searchTerm.trim().length > 0;

  return (
    <div className={embedded ? styles.containerEmbedded : styles.container}>
      <div className={styles.card}>
        {showHeader ? (
          <div className={styles.header}>
            <h2>{title}</h2>
            <p className={styles.subtitle}>
              {subtitle}
            </p>
          </div>
        ) : null}

        {loadingParticipants ? (
          <div className={styles.loading}>
            <p>{t('sessionBuilder.loading')}</p>
          </div>
        ) : (
          <>
            <div className={styles.toolbar}>
              <div className={styles.searchBox}>
                <input
                  type="text"
                  placeholder={t('sessionBuilder.searchParticipantsPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={styles.input}
                  aria-label={t('sessionBuilder.searchParticipantsPlaceholder')}
                />
              </div>

              {participants.length > 0 ? (
                <div className={styles.controls}>
                  <button
                    type="button"
                    onClick={selectAll}
                    className={styles.btnSecondaryMini}
                    disabled={!canSelectAll}
                  >
                    {t('sessionBuilder.selectAll')}
                  </button>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className={styles.btnSecondaryMini}
                    disabled={!canDeselectAll}
                  >
                    {t('sessionBuilder.deselectAll')}
                  </button>
                </div>
              ) : null}
            </div>

            {selected.length >= MAX_PARTICIPANTS ? (
              <div className={styles.empty}>
                <p>{t('sessionBuilder.maxParticipantsReached', { count: MAX_PARTICIPANTS })}</p>
                <small>{t('sessionBuilder.maxParticipantsReachedBody')}</small>
              </div>
            ) : null}

            {participants.length === 0 ? (
              <div className={styles.empty}>
                <p>{t('sessionBuilder.noParticipantsAvailable')}</p>
                <small>
                  {t('sessionBuilder.noParticipantsAvailableBody')}
                </small>
              </div>
            ) : filteredParticipants.length === 0 ? (
              <div className={styles.empty}>
                <p>{t('sessionBuilder.noParticipantsFound')}</p>
                <small>
                  {hasSearch ? t('sessionBuilder.noParticipantsFoundBody') : t('sessionBuilder.noSelectionSummary')}
                </small>
              </div>
            ) : (
              <>
                <div className={styles.list}>
                  {filteredParticipants.map((participant) => (
                    <label key={participant.id} className={styles.item}>
                      <span className={styles.checkboxHit}>
                        <input
                          type="checkbox"
                          checked={selected.includes(participant.id)}
                          onChange={() => toggleParticipant(participant.id)}
                          disabled={!selected.includes(participant.id) && selected.length >= MAX_PARTICIPANTS}
                          aria-label={t('sessionBuilder.rowCheckboxLabel', { name: getMemberDisplayName(participant) })}
                        />
                      </span>
                      <span className={styles.avatar} aria-hidden="true">{getInitials(participant)}</span>
                      <div className={styles.info}>
                        {embedded ? (
                          <>
                            <span className={styles.identityInline}>{getEmbeddedName(participant)}</span>
                            {participant.email ? <span className={styles.email}>{participant.email}</span> : null}
                          </>
                        ) : (
                          <>
                            <strong>{getMemberDisplayName(participant)}</strong>
                            {participant.email ? <span className={styles.email}>{participant.email}</span> : null}
                          </>
                        )}
                      </div>
                      {selected.includes(participant.id) ? (
                        <span className={styles.badge}>{t('sessionBuilder.selectedBadge')}</span>
                      ) : (
                        <span className={styles.badgeMuted}>{t('sessionBuilder.participantBadge')}</span>
                      )}
                    </label>
                  ))}
                </div>

              </>
            )}

            {!hideActions ? (
              <div className={styles.actions}>
                <button
                  type="button"
                  onClick={onCancel}
                  className={styles.btnSecondary}
                  disabled={isLoading}
                >
                  {t('sessionBuilder.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleAssign}
                  className={styles.btnPrimary}
                  disabled={isLoading || selected.length === 0}
                >
                  {isLoading ? t('sessionBuilder.saving') : t('sessionBuilder.assignParticipants')}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
