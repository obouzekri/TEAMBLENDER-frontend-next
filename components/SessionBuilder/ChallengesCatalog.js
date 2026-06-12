'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ChallengeRulesPreviewModal from './ChallengeRulesPreviewModal';
import SessionCardSkeleton from '@/components/SessionCardSkeleton';
import styles from './ChallengesCatalog.module.css';
import { Badge, Button, EmptyState } from '@/components/ui';
import { formatIdealPlayersLabel } from '@/lib/challenges/playerRange';

const MAX_FILTER_OBJECTIVES = 3;

// Mapping technical values to display labels
const CATEGORY_LABELS = {
  'escape-game': 'Escape Game',
  'logique-reflexion': 'Logic & Reflection',
  'icebreaker': 'Icebreaker',
  'creativite-innovation': 'Creativity & Innovation',
  'memoire-attention': 'Memory & Attention',
  'culture-decouverte': 'Culture & Discovery',
  'Collaboration': 'Collaboration',
  'Gestion de projet': 'Project Management',
  'Engagement collectif': 'Collective Engagement',
};

const OBJECTIVE_LABELS = {
  'cohesion': 'Cohesion',
  'communication': 'Communication',
  'collaboration': 'Collaboration',
  'leadership': 'Leadership',
  'resolution-problemes': 'Problem Solving',
  'coordination': 'Coordination',
  'priorisation': 'Prioritization',
  'dependances': 'Dependencies',
  'engagement': 'Engagement',
  'ecoute active': 'Active Listening',
  'intelligence-collective': 'Collective Intelligence',
  'creativite': 'Creativity',
  'gestion-temps': 'Time Management',
};

function toObjectiveList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
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
  onConfigure,
  onFilterChange,
  onToggleCategory,
  onToggleObjective,
  onResetFilters,
}) {
  const [previewChallenge, setPreviewChallenge] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const filterMenuRef = useRef(null);

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

  // Extract unique categories from challenges
  const categories = useMemo(() => {
    const unique = new Set();
    const source = Array.isArray(allChallenges) && allChallenges.length > 0 ? allChallenges : challenges;
    source.forEach((c) => {
      if (c.category) unique.add(c.category);
    });
    
    const sorted = Array.from(unique).sort();
    return [
      { value: '', label: 'All' },
      ...sorted.map((cat) => ({
        value: cat,
        label: CATEGORY_LABELS[cat] || cat,
      })),
    ];
  }, [allChallenges, challenges]);

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
      { value: '', label: 'All' },
      ...sorted.map((obj) => ({
        value: obj,
        label: OBJECTIVE_LABELS[obj] || obj,
      })),
    ];
  }, [allChallenges, challenges]);

  const durations = [
    { value: '', label: 'All' },
    { value: 'short', label: 'Less than 10 min' },
    { value: 'medium', label: '10-20 min' },
    { value: 'long', label: 'More than 20 min' },
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
      return 'All';
    }
    if (values.length === 1) {
      return labelMap.get(values[0]) || values[0];
    }
    if (values.length > 3) {
      return `${values.length} selected`;
    }
    return values
      .map((value) => toAbbreviation(labelMap.get(value) || value))
      .filter(Boolean)
      .join(', ');
  }

  const categoryTriggerLabel = formatMultiSelectValue(selectedCategories, categoryLabelMap);
  const objectiveTriggerLabel = formatMultiSelectValue(selectedObjectives, objectiveLabelMap);
  const durationTriggerLabel = durations.find((dur) => dur.value === filters.duration)?.label || 'All';

  return (
    <section className={styles.catalog} data-catalog>
      <div className={styles.filterBar}>
        <div className={styles.filterLine} ref={filterMenuRef}>
          <span className={styles.filtersLabel}>Filters</span>

          <div className={styles.filterControls}>
            <div className={styles.filterDropdownWrap}>
              <button
                type="button"
                className={styles.filterDropdownButton}
                onClick={() => setOpenDropdown((prev) => (prev === 'category' ? null : 'category'))}
                aria-expanded={openDropdown === 'category'}
                aria-haspopup="listbox"
                aria-label={`Category filter: ${categoryTriggerLabel}`}
              >
                <span className={styles.filterTriggerPrefix}>Category:</span>
                <span className={styles.filterTriggerValue}>{categoryTriggerLabel}</span>
                <span aria-hidden="true">▾</span>
              </button>

              {openDropdown === 'category' ? (
                <div className={styles.filterDropdownPanel} role="listbox" aria-label="Filter by category" aria-multiselectable="true">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedCategories.length === 0}
                    className={`${styles.filterOption} ${selectedCategories.length === 0 ? styles.filterOptionActive : ''}`}
                    onClick={() => onFilterChange({ categories: [] })}
                  >
                    <span>All</span>
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
                aria-label={`Objective filter: ${objectiveTriggerLabel}`}
              >
                <span className={styles.filterTriggerPrefix}>Objectives:</span>
                <span className={styles.filterTriggerValue}>{objectiveTriggerLabel}</span>
                <span aria-hidden="true">▾</span>
              </button>

              {openDropdown === 'objective' ? (
                <div className={styles.filterDropdownPanel} role="listbox" aria-label="Filter by objectives" aria-multiselectable="true">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedObjectives.length === 0}
                    className={`${styles.filterOption} ${selectedObjectives.length === 0 ? styles.filterOptionActive : ''}`}
                    onClick={() => onFilterChange({ objectives: [] })}
                  >
                    <span>All</span>
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
                      ? 'Limit reached (max 3 objectives).'
                      : `Multi-select (max ${MAX_FILTER_OBJECTIVES}).`}
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
                aria-label={`Duration filter: ${durationTriggerLabel}`}
              >
                <span className={styles.filterTriggerPrefix}>Duration:</span>
                <span className={styles.filterTriggerValue}>{durationTriggerLabel}</span>
                <span aria-hidden="true">▾</span>
              </button>

              {openDropdown === 'duration' ? (
                <div className={styles.filterDropdownPanel} role="listbox" aria-label="Filter by duration">
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
              title="Reset filters"
              aria-label="Reset filters"
            >
              ↺
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
          title="No activity matches your criteria"
          description="Adjust filters or return to the full catalog view."
          actions={<Button variant="secondary" size="sm" onClick={onResetFilters}>Reset filters</Button>}
          className={styles.emptyState}
        />
      ) : (
        <div className={styles.grid}>
          {challenges.map((challenge) => {
            const isSelected = selectedIds.includes(challenge.id);
            const challengeObjectives = toObjectiveList(challenge.objectives || challenge.objective).slice(0, 3);
            const idealPlayersLabel = formatIdealPlayersLabel(challenge);
            return (
              <div key={challenge.id} className={`${styles.card} ${isSelected ? styles.selected : ''}`}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>{challenge.name}</h3>
                  <div className={styles.rulesMeta}>
                    <button
                      type="button"
                      className={styles.rulesButton}
                      onClick={() => setPreviewChallenge(challenge)}
                      title="View rules"
                      aria-label={`View rules for ${challenge.name}`}
                    >
                      <span aria-hidden="true">📜</span>
                      <span>View rules</span>
                    </button>
                    <span className={styles.cardDuration}>{challenge.duration} min</span>
                  </div>
                </div>

                <p className={styles.cardDescription}>{challenge.description}</p>
                {idealPlayersLabel ? <p className={styles.playerHint}>{idealPlayersLabel}</p> : null}

                <div className={styles.cardMeta}>
                  {challenge.category ? (
                    <Badge className={styles.badge}>{CATEGORY_LABELS[challenge.category] || challenge.category}</Badge>
                  ) : null}
                  {challengeObjectives.map((objective) => (
                    <Badge key={`${challenge.id}-${objective}`} variant="info" className={`${styles.badge} ${styles.objectiveBadge}`}>
                      {OBJECTIVE_LABELS[objective] || objective}
                    </Badge>
                  ))}
                </div>

                <div className={styles.cardActions}>
                  <Button
                    variant={isSelected ? 'secondary' : 'primary'}
                    onClick={() => {
                      if (!isSelected) {
                        onSelect(challenge.id);
                      }
                    }}
                    disabled={isSelected}
                  >
                    {isSelected ? '✓ Added' : '+ Add'}
                  </Button>
                  {isSelected && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onConfigure(challenge.id)}
                    >
                      ⚙ Configure
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewChallenge ? (
        <ChallengeRulesPreviewModal
          challenge={previewChallenge}
          onClose={() => setPreviewChallenge(null)}
        />
      ) : null}
    </section>
  );
}
