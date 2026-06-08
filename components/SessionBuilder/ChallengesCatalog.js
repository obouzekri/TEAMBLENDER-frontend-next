'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ChallengeRulesPreviewModal from './ChallengeRulesPreviewModal';
import SessionCardSkeleton from '@/components/SessionCardSkeleton';
import styles from './ChallengesCatalog.module.css';
import { Badge, Button, EmptyState } from '@/components/ui';
import { formatIdealPlayersLabel } from '@/lib/challenges/playerRange';

const MAX_FILTER_OBJECTIVES = 3;

// Mapping des valeurs techniques aux labels affichés
const CATEGORY_LABELS = {
  'escape-game': 'Escape Game',
  'logique-reflexion': 'Logique & Réflexion',
  'icebreaker': 'Icebreaker',
  'creativite-innovation': 'Créativité & innovation',
  'memoire-attention': 'Mémoire & attention',
  'culture-decouverte': 'Culture & découverte',
  'Collaboration': 'Collaboration',
  'Gestion de projet': 'Gestion de projet',
  'Engagement collectif': 'Engagement collectif',
};

const OBJECTIVE_LABELS = {
  'cohesion': 'Cohésion',
  'communication': 'Communication',
  'collaboration': 'Collaboration',
  'leadership': 'Leadership',
  'resolution-problemes': 'Résolution de problèmes',
  'coordination': 'Coordination',
  'priorisation': 'Priorisation',
  'dependances': 'Dépendances',
  'engagement': 'Engagement',
  'ecoute active': 'Écoute active',
  'intelligence-collective': 'Intelligence collective',
  'creativite': 'Créativité',
  'gestion-temps': 'Gestion du temps',
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

  // Extraire les catégories uniques depuis les challenges
  const categories = useMemo(() => {
    const unique = new Set();
    const source = Array.isArray(allChallenges) && allChallenges.length > 0 ? allChallenges : challenges;
    source.forEach((c) => {
      if (c.category) unique.add(c.category);
    });
    
    const sorted = Array.from(unique).sort();
    return [
      { value: '', label: 'Tous' },
      ...sorted.map((cat) => ({
        value: cat,
        label: CATEGORY_LABELS[cat] || cat,
      })),
    ];
  }, [allChallenges, challenges]);

  // Extraire les objectifs uniques depuis les challenges
  // Gérer les deux formats: string (nouveau) et array (ancien)
  const objectives = useMemo(() => {
    const unique = new Set();
    const source = Array.isArray(allChallenges) && allChallenges.length > 0 ? allChallenges : challenges;
    source.forEach((c) => {
      toObjectiveList(c.objectives).forEach((obj) => unique.add(obj));
    });
    
    const sorted = Array.from(unique).sort();
    return [
      { value: '', label: 'Tous' },
      ...sorted.map((obj) => ({
        value: obj,
        label: OBJECTIVE_LABELS[obj] || obj,
      })),
    ];
  }, [allChallenges, challenges]);

  const durations = [
    { value: '', label: 'Tous' },
    { value: 'short', label: 'Moins de 10 min' },
    { value: 'medium', label: '10-20 min' },
    { value: 'long', label: 'Plus de 20 min' },
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
      return 'Tout';
    }
    if (values.length === 1) {
      return labelMap.get(values[0]) || values[0];
    }
    if (values.length > 3) {
      return `${values.length} sélectionnés`;
    }
    return values
      .map((value) => toAbbreviation(labelMap.get(value) || value))
      .filter(Boolean)
      .join(', ');
  }

  const categoryTriggerLabel = formatMultiSelectValue(selectedCategories, categoryLabelMap);
  const objectiveTriggerLabel = formatMultiSelectValue(selectedObjectives, objectiveLabelMap);
  const durationTriggerLabel = durations.find((dur) => dur.value === filters.duration)?.label || 'Tout';

  return (
    <section className={styles.catalog} data-catalog>
      <div className={styles.filterBar}>
        <div className={styles.filterLine} ref={filterMenuRef}>
          <span className={styles.filtersLabel}>Filtres</span>

          <div className={styles.filterControls}>
            <div className={styles.filterDropdownWrap}>
              <button
                type="button"
                className={styles.filterDropdownButton}
                onClick={() => setOpenDropdown((prev) => (prev === 'category' ? null : 'category'))}
                aria-expanded={openDropdown === 'category'}
                aria-haspopup="listbox"
                aria-label={`Filtre catégorie: ${categoryTriggerLabel}`}
              >
                <span className={styles.filterTriggerPrefix}>Catégorie:</span>
                <span className={styles.filterTriggerValue}>{categoryTriggerLabel}</span>
                <span aria-hidden="true">▾</span>
              </button>

              {openDropdown === 'category' ? (
                <div className={styles.filterDropdownPanel} role="listbox" aria-label="Filtrer par catégorie" aria-multiselectable="true">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedCategories.length === 0}
                    className={`${styles.filterOption} ${selectedCategories.length === 0 ? styles.filterOptionActive : ''}`}
                    onClick={() => onFilterChange({ categories: [] })}
                  >
                    <span>Tout</span>
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
                aria-label={`Filtre objectifs: ${objectiveTriggerLabel}`}
              >
                <span className={styles.filterTriggerPrefix}>Objectifs:</span>
                <span className={styles.filterTriggerValue}>{objectiveTriggerLabel}</span>
                <span aria-hidden="true">▾</span>
              </button>

              {openDropdown === 'objective' ? (
                <div className={styles.filterDropdownPanel} role="listbox" aria-label="Filtrer par objectifs" aria-multiselectable="true">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedObjectives.length === 0}
                    className={`${styles.filterOption} ${selectedObjectives.length === 0 ? styles.filterOptionActive : ''}`}
                    onClick={() => onFilterChange({ objectives: [] })}
                  >
                    <span>Tout</span>
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
                      ? 'Limite atteinte (3 objectifs max).'
                      : `Sélection multiple (max ${MAX_FILTER_OBJECTIVES}).`}
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
                aria-label={`Filtre durée: ${durationTriggerLabel}`}
              >
                <span className={styles.filterTriggerPrefix}>Durée:</span>
                <span className={styles.filterTriggerValue}>{durationTriggerLabel}</span>
                <span aria-hidden="true">▾</span>
              </button>

              {openDropdown === 'duration' ? (
                <div className={styles.filterDropdownPanel} role="listbox" aria-label="Filtrer par durée">
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
              title="Réinitialiser les filtres"
              aria-label="Réinitialiser les filtres"
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
          title="Aucune activité ne correspond à vos critères"
          description="Ajustez les filtres ou revenez à la vue complète du catalogue."
          actions={<Button variant="secondary" size="sm" onClick={onResetFilters}>Réinitialiser les filtres</Button>}
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
                      title="Voir les règles"
                      aria-label={`Voir les règles de ${challenge.name}`}
                    >
                      <span aria-hidden="true">📜</span>
                      <span>Voir les règles</span>
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
                    {isSelected ? '✓ Ajoutée' : '+ Ajouter'}
                  </Button>
                  {isSelected && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onConfigure(challenge.id)}
                    >
                      ⚙ Configurer
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
