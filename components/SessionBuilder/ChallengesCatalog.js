'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ChallengeRulesPreviewModal from './ChallengeRulesPreviewModal';
import SessionCardSkeleton from '@/components/SessionCardSkeleton';
import styles from './ChallengesCatalog.module.css';
import { Badge, Button, EmptyState } from '@/components/ui';
import { formatIdealPlayersLabel } from '@/lib/challenges/playerRange';
import useI18n from '@/lib/i18n/useI18n';

const MAX_FILTER_OBJECTIVES = 3;

// Mapping technical values to display labels
const CATEGORY_LABELS = {
  'escape-game': { fr: 'Escape Game', en: 'Escape Game' },
  'logique-reflexion': { fr: 'Logique & Reflexion', en: 'Logic & Reflection' },
  'icebreaker': { fr: 'Icebreaker', en: 'Icebreaker' },
  'creativite-innovation': { fr: 'Creativite & Innovation', en: 'Creativity & Innovation' },
  'memoire-attention': { fr: 'Memoire & Attention', en: 'Memory & Attention' },
  'culture-decouverte': { fr: 'Culture & Decouverte', en: 'Culture & Discovery' },
  Collaboration: { fr: 'Collaboration', en: 'Collaboration' },
  'Gestion de projet': { fr: 'Gestion de projet', en: 'Project Management' },
  'Engagement collectif': { fr: 'Engagement collectif', en: 'Collective Engagement' },
};

const OBJECTIVE_LABELS = {
  cohesion: { fr: 'Cohesion', en: 'Cohesion' },
  communication: { fr: 'Communication', en: 'Communication' },
  collaboration: { fr: 'Collaboration', en: 'Collaboration' },
  leadership: { fr: 'Leadership', en: 'Leadership' },
  'resolution-problemes': { fr: 'Resolution de problemes', en: 'Problem Solving' },
  coordination: { fr: 'Coordination', en: 'Coordination' },
  priorisation: { fr: 'Priorisation', en: 'Prioritization' },
  dependances: { fr: 'Dependances', en: 'Dependencies' },
  engagement: { fr: 'Engagement', en: 'Engagement' },
  'ecoute active': { fr: 'Ecoute active', en: 'Active Listening' },
  'intelligence-collective': { fr: 'Intelligence collective', en: 'Collective Intelligence' },
  creativite: { fr: 'Creativite', en: 'Creativity' },
  'gestion-temps': { fr: 'Gestion du temps', en: 'Time Management' },
};

function toObjectiveList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const localized = item.fr ?? item.en ?? '';
          return String(localized || '').trim();
        }
        return String(item || '').trim();
      })
      .filter(Boolean);
  }

  if (value && typeof value === 'object') {
    const localized = value.fr ?? value.en ?? '';
    return String(localized || '').trim() ? [String(localized).trim()] : [];
  }

  const raw = String(value || '').trim();
  if (!raw) return [];

  return raw.split(',').map((item) => item.trim()).filter(Boolean);
}

export default function ChallengesCatalog({
  challenges,
  allChallenges,
  selectedIds,
  filters,
  isLoading,
  onSelect,
  onDeselect,
  onConfigure,
  onFilterChange,
  onToggleCategory,
  onToggleObjective,
  onResetFilters,
}) {
  const { locale, t } = useI18n();
  const isEn = locale === 'en';
  const [previewChallenge, setPreviewChallenge] = useState(null);
  function localizeMappingLabel(entry, fallback) {
    if (!entry || typeof entry !== 'object') {
      return fallback;
    }
    return String(entry[isEn ? 'en' : 'fr'] || entry.en || entry.fr || fallback || '').trim();
  }

  function localizePlainValue(value) {
    if (value == null) return '';
    if (typeof value === 'object' && !Array.isArray(value)) {
      return String(value[isEn ? 'en' : 'fr'] || value.en || value.fr || '').trim();
    }
    return String(value || '').trim();
  }

  const [openDropdown, setOpenDropdown] = useState(null);
  const [visibleCount, setVisibleCount] = useState(12);
  const filterMenuRef = useRef(null);
  const loadMoreRef = useRef(null);

  useEffect(() => {
    function handleDocumentClick(event) {
      if (!filterMenuRef.current) return;
      if (!filterMenuRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setOpenDropdown(null);
      }
    }

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    setVisibleCount(12);
  }, [challenges]);

  useEffect(() => {
    if (isLoading) return undefined;
    if (visibleCount >= challenges.length) return undefined;
    if (!loadMoreRef.current) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setVisibleCount((current) => Math.min(current + 8, challenges.length));
      },
      { rootMargin: '240px 0px' }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [challenges.length, isLoading, visibleCount]);

  // Extract unique categories from challenges
  const categories = useMemo(() => {
    const unique = new Set();
    const source = Array.isArray(allChallenges) && allChallenges.length > 0 ? allChallenges : challenges;
    source.forEach((c) => {
      if (c.category) unique.add(c.category);
    });
    
    const sorted = Array.from(unique).sort();
    return [
      { value: '', label: t('sessionBuilder.catalogFilterAll') },
      ...sorted.map((cat) => ({
        value: cat,
        label: localizeMappingLabel(CATEGORY_LABELS[cat], cat),
      })),
    ];
  }, [allChallenges, challenges, isEn, t]);

  // Extract unique objectives from challenges
  // Handle both formats: string (new) and array (legacy)
  const objectives = useMemo(() => {
    const unique = new Set();
    const source = Array.isArray(allChallenges) && allChallenges.length > 0 ? allChallenges : challenges;
    source.forEach((c) => {
      toObjectiveList(c.objectives).forEach((obj) => unique.add(obj));
    });
    
    const sorted = Array.from(unique).sort();
    return [
      { value: '', label: t('sessionBuilder.catalogFilterAll') },
      ...sorted.map((obj) => ({
        value: obj,
        label: localizeMappingLabel(OBJECTIVE_LABELS[obj], obj),
      })),
    ];
  }, [allChallenges, challenges, isEn, t]);

  const durations = [
    { value: '', label: t('sessionBuilder.catalogFilterAll') },
    { value: 'short', label: t('sessionBuilder.catalogDurationShort') },
    { value: 'medium', label: t('sessionBuilder.catalogDurationMedium') },
    { value: 'long', label: t('sessionBuilder.catalogDurationLong') },
  ];

  const selectedCategories = Array.isArray(filters.categories) ? filters.categories : [];
  const selectedObjectives = Array.isArray(filters.objectives) ? filters.objectives : [];
  const objectiveLimitReached = selectedObjectives.length >= MAX_FILTER_OBJECTIVES;

  const categoryLabelMap = useMemo(() => {
    const map = new Map();
    categories.forEach((item) => {
      if (item.value) {
        map.set(item.value, item.label);
      }
    });
    return map;
  }, [categories]);

  const objectiveLabelMap = useMemo(() => {
    const map = new Map();
    objectives.forEach((item) => {
      if (item.value) {
        map.set(item.value, item.label);
      }
    });
    return map;
  }, [objectives]);

  function toAbbreviation(label) {
    return String(label || '')
      .trim()
      .replace(/\s+/g, '')
      .slice(0, 4);
  }

  function formatMultiSelectValue(values, labelMap) {
    if (!Array.isArray(values) || values.length === 0) {
      return t('sessionBuilder.catalogFilterAll');
    }
    if (values.length === 1) {
      return labelMap.get(values[0]) || values[0];
    }
    if (values.length > 3) {
      return t('sessionBuilder.catalogFilterSelectedCount', { count: values.length });
    }
    return values
      .map((value) => toAbbreviation(labelMap.get(value) || value))
      .filter(Boolean)
      .join(', ');
  }

  const categoryTriggerLabel = formatMultiSelectValue(selectedCategories, categoryLabelMap);
  const objectiveTriggerLabel = formatMultiSelectValue(selectedObjectives, objectiveLabelMap);
  const durationTriggerLabel = durations.find((dur) => dur.value === filters.duration)?.label || 'All';
  const visibleChallenges = useMemo(() => challenges.slice(0, visibleCount), [challenges, visibleCount]);

  return (
    <section className={styles.catalog} data-catalog>
      <div className={styles.filterBar}>
        <div className={styles.filterLine} ref={filterMenuRef}>
          <div className={styles.filterControls}>
            <div className={styles.filterDropdownWrap}>
              <button
                type="button"
                className={styles.filterDropdownButton}
                onClick={() => setOpenDropdown((prev) => (prev === 'category' ? null : 'category'))}
                aria-expanded={openDropdown === 'category'}
                aria-haspopup="listbox"
                aria-label={t('sessionBuilder.catalogCategoryFilterAria', { value: categoryTriggerLabel })}
              >
                <span className={styles.filterTriggerPrefix}>{t('sessionBuilder.catalogCategoryPrefix')}</span>
                <span className={styles.filterTriggerValue}>{categoryTriggerLabel}</span>
                <span aria-hidden="true">▾</span>
              </button>

              {openDropdown === 'category' ? (
                <div className={styles.filterDropdownPanel} role="listbox" aria-label={t('sessionBuilder.catalogFilterByCategory')} aria-multiselectable="true">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedCategories.length === 0}
                    className={`${styles.filterOption} ${selectedCategories.length === 0 ? styles.filterOptionActive : ''}`}
                    onClick={() => onFilterChange({ categories: [] })}
                  >
                    <span>{t('sessionBuilder.catalogFilterAll')}</span>
                    {selectedCategories.length === 0 ? <span aria-hidden="true">✓</span> : null}
                  </button>
                  {categories.filter((cat) => cat.value).map((cat) => {
                    const active = selectedCategories.includes(cat.value);
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={`${styles.filterOption} ${active ? styles.filterOptionActive : ''}`}
                        onClick={() => onToggleCategory(cat.value)}
                      >
                        <span>{cat.label}</span>
                        {active ? <span aria-hidden="true">✓</span> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className={styles.filterDropdownWrap}>
              <button
                type="button"
                className={styles.filterDropdownButton}
                onClick={() => setOpenDropdown((prev) => (prev === 'objective' ? null : 'objective'))}
                aria-expanded={openDropdown === 'objective'}
                aria-haspopup="listbox"
                aria-label={t('sessionBuilder.catalogObjectiveFilterAria', { value: objectiveTriggerLabel })}
              >
                <span className={styles.filterTriggerPrefix}>{t('sessionBuilder.catalogObjectivePrefix')}</span>
                <span className={styles.filterTriggerValue}>{objectiveTriggerLabel}</span>
                <span aria-hidden="true">▾</span>
              </button>

              {openDropdown === 'objective' ? (
                <div className={styles.filterDropdownPanel} role="listbox" aria-label={t('sessionBuilder.catalogFilterByObjectives')} aria-multiselectable="true">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedObjectives.length === 0}
                    className={`${styles.filterOption} ${selectedObjectives.length === 0 ? styles.filterOptionActive : ''}`}
                    onClick={() => onFilterChange({ objectives: [] })}
                  >
                    <span>{t('sessionBuilder.catalogFilterAll')}</span>
                    {selectedObjectives.length === 0 ? <span aria-hidden="true">✓</span> : null}
                  </button>
                  {objectives.filter((obj) => obj.value).map((obj) => {
                    const active = selectedObjectives.includes(obj.value);
                    const disabled = !active && objectiveLimitReached;
                    return (
                      <button
                        key={obj.value}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={`${styles.filterOption} ${active ? styles.filterOptionActive : ''}`}
                        onClick={() => onToggleObjective(obj.value)}
                        disabled={disabled}
                      >
                        <span>{obj.label}</span>
                        {active ? <span aria-hidden="true">✓</span> : null}
                      </button>
                    );
                  })}
                  <p className={styles.filterHintInline}>
                    {objectiveLimitReached
                      ? t('sessionBuilder.catalogObjectiveLimitReached', { max: MAX_FILTER_OBJECTIVES })
                      : t('sessionBuilder.catalogObjectiveMultiSelect', { max: MAX_FILTER_OBJECTIVES })}
                  </p>
                </div>
              ) : null}
            </div>

            <div className={styles.filterDropdownWrap}>
              <button
                type="button"
                className={styles.filterDropdownButton}
                onClick={() => setOpenDropdown((prev) => (prev === 'duration' ? null : 'duration'))}
                aria-expanded={openDropdown === 'duration'}
                aria-haspopup="listbox"
                aria-label={t('sessionBuilder.catalogDurationFilterAria', { value: durationTriggerLabel })}
              >
                <span className={styles.filterTriggerPrefix}>{t('sessionBuilder.catalogDurationPrefix')}</span>
                <span className={styles.filterTriggerValue}>{durationTriggerLabel}</span>
                <span aria-hidden="true">▾</span>
              </button>

              {openDropdown === 'duration' ? (
                <div className={styles.filterDropdownPanel} role="listbox" aria-label={t('sessionBuilder.catalogFilterByDuration')}>
                  {durations.map((dur) => {
                    const active = String(filters.duration || '') === String(dur.value || '');
                    return (
                      <button
                        key={dur.value || 'all'}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={`${styles.filterOption} ${active ? styles.filterOptionActive : ''}`}
                        onClick={() => {
                          onFilterChange({ duration: dur.value });
                          setOpenDropdown(null);
                        }}
                      >
                        <span>{dur.label}</span>
                        {active ? <span aria-hidden="true">✓</span> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>

          <div className={styles.filterActions}>
            <button
              className={styles.resetIconButton}
              onClick={onResetFilters}
              type="button"
              title={t('sessionBuilder.catalogResetFilters')}
              aria-label={t('sessionBuilder.catalogResetFilters')}
            >
              <span aria-hidden="true">⟳</span>
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.skeletonGrid}>
          {[...Array(6)].map((_, i) => (
            <SessionCardSkeleton key={i} />
          ))}
        </div>
      ) : challenges.length === 0 ? (
        <EmptyState
          icon="🔍"
          title={t('sessionBuilder.catalogEmptyTitle')}
          description={t('sessionBuilder.catalogEmptyDescription')}
          actions={<Button variant="secondary" size="sm" onClick={onResetFilters}>{t('sessionBuilder.catalogResetFilters')}</Button>}
          className={styles.emptyState}
        />
      ) : (
        <div className={styles.grid}>
          {visibleChallenges.map((challenge) => {
            const isSelected = selectedIds.includes(challenge.id);
            const challengeObjectives = toObjectiveList(challenge.objectives || challenge.objective).slice(0, 3);
            const idealPlayersLabel = formatIdealPlayersLabel(challenge);
            const challengeName = localizePlainValue(challenge.name) || (isEn ? 'Activity' : 'Activite');
            const challengeDescription = localizePlainValue(challenge.description);
            const challengeDuration = Number(challenge?.duration || challenge?.config?.duration_minutes || 0);
            return (
              <div key={challenge.id} className={`${styles.card} ${isSelected ? styles.selected : ''}`}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>{challengeName}</h3>
                  <div className={styles.rulesMeta}>
                    <button
                      type="button"
                      className={styles.rulesButton}
                      onClick={() => setPreviewChallenge(challenge)}
                      title={t('challengeRulesPanel.showRules')}
                      aria-label={t('sessionBuilder.catalogViewRulesFor', { name: challengeName })}
                    >
                      <span aria-hidden="true">📜</span>
                      <span>{t('challengeRulesPanel.showRules')}</span>
                    </button>
                    <span className={styles.cardDuration}>{challengeDuration > 0 ? `${challengeDuration} min` : '—'}</span>
                  </div>
                </div>

                <p className={styles.cardDescription}>{challengeDescription}</p>
                {idealPlayersLabel ? <p className={styles.playerHint}>{idealPlayersLabel}</p> : null}

                <div className={styles.cardMeta}>
                  {challenge.category ? (
                    <Badge className={styles.badge}>
                      {localizeMappingLabel(CATEGORY_LABELS[localizePlainValue(challenge.category)], localizePlainValue(challenge.category))}
                    </Badge>
                  ) : null}
                  {challengeObjectives.map((objective) => (
                    <Badge key={`${challenge.id}-${objective}`} variant="info" className={`${styles.badge} ${styles.objectiveBadge}`}>
                      {localizeMappingLabel(OBJECTIVE_LABELS[objective], objective)}
                    </Badge>
                  ))}
                </div>

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={`${styles.toggleAction} ${isSelected ? styles.toggleActionSelected : ''}`}
                    onClick={() => {
                      if (isSelected) {
                        onDeselect?.(challenge.id);
                      } else {
                        onSelect(challenge.id);
                      }
                    }}
                  >
                    <span className={styles.toggleActionKnob} aria-hidden="true" />
                    <span className={styles.toggleActionLabel}>{isSelected ? t('sessionBuilder.catalogRemoveAction') : t('sessionBuilder.catalogAddAction')}</span>
                  </button>
                  {isSelected && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onConfigure(challenge.id)}
                    >
                      ⚙ {t('sessionBuilder.catalogConfigureAction')}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && visibleCount < challenges.length ? (
        <div className={styles.loadMoreSentinelWrap}>
          <div ref={loadMoreRef} className={styles.loadMoreSentinel} aria-hidden="true" />
          <p className={styles.loadingMoreText}>{t('sessionBuilder.catalogLoadingMore')}</p>
        </div>
      ) : null}

      {previewChallenge ? (
        <ChallengeRulesPreviewModal
          challenge={previewChallenge}
          onClose={() => setPreviewChallenge(null)}
        />
      ) : null}
    </section>
  );
}
