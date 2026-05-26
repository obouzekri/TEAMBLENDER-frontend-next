'use client';

import { useMemo, useState } from 'react';
import ChallengeRulesPreviewModal from './ChallengeRulesPreviewModal';
import SessionCardSkeleton from '@/components/SessionCardSkeleton';
import styles from './ChallengesCatalog.module.css';

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
  const activeFiltersCount = selectedCategories.length + selectedObjectives.length + (filters.duration ? 1 : 0);

  return (
    <section className={styles.catalog}>
      <div className={styles.filterBar}>
        <div className={styles.filterBarHeader}>
          <div>
            <p className={styles.filterTitle}>Filtrer le catalogue</p>
            <p className={styles.filterSubtitle}>Affinez rapidement les challenges par catégorie, objectif et durée.</p>
          </div>
          <div className={styles.filterStats}>
            <span>{activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}</span>
            <span>{challenges.length} challenge{challenges.length > 1 ? 's' : ''} affiché{challenges.length > 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className={styles.filterBody}>
          <div className={styles.filterGroup}>
            <label className={styles.filterField}>
              <span className={styles.filterLabel}>Catégories</span>
              <div className={styles.filterChips}>
                {categories.filter((cat) => cat.value).map((cat) => {
                  const active = selectedCategories.includes(cat.value);
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      className={`${styles.filterChip} ${active ? styles.filterChipActive : ''}`}
                      onClick={() => onToggleCategory(cat.value)}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </label>

            <label className={styles.filterField}>
              <span className={styles.filterLabel}>Objectifs ({selectedObjectives.length}/{MAX_FILTER_OBJECTIVES})</span>
              <div className={styles.filterChips}>
                {objectives.filter((obj) => obj.value).map((obj) => {
                  const active = selectedObjectives.includes(obj.value);
                  const disabled = !active && objectiveLimitReached;
                  return (
                    <button
                      key={obj.value}
                      type="button"
                      className={`${styles.filterChip} ${active ? styles.filterChipActive : ''}`}
                      onClick={() => onToggleObjective(obj.value)}
                      disabled={disabled}
                    >
                      {obj.label}
                    </button>
                  );
                })}
              </div>
              <span className={styles.filterHint}>
                {objectiveLimitReached
                  ? 'Limite atteinte: retirez un objectif pour en ajouter un autre.'
                  : 'Sélection multiple possible (max 3).'}
              </span>
            </label>

            <label className={styles.filterField}>
              <span className={styles.filterLabel}>Durée</span>
              <div className={styles.filterChips}>
                {durations.filter((dur) => dur.value).map((dur) => {
                  const active = filters.duration === dur.value;
                  return (
                    <button
                      key={dur.value}
                      type="button"
                      className={`${styles.filterChip} ${active ? styles.filterChipActive : ''}`}
                      onClick={() => onFilterChange({ duration: active ? '' : dur.value })}
                    >
                      {dur.label}
                    </button>
                  );
                })}
              </div>
            </label>
          </div>

          <div className={styles.filterActions}>
            <button className="btn-secondary btn-sm" onClick={onResetFilters}>
              ↻ Réinitialiser
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
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🔍</div>
          <p className={styles.emptyText}>Aucune activité ne correspond à vos critères</p>
          <button className="btn-secondary btn-sm" onClick={onResetFilters}>
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {challenges.map((challenge) => {
            const isSelected = selectedIds.includes(challenge.id);
            const challengeObjectives = toObjectiveList(challenge.objectives || challenge.objective).slice(0, 3);
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

                <div className={styles.cardMeta}>
                  {challenge.category ? (
                    <span className={styles.badge}>{CATEGORY_LABELS[challenge.category] || challenge.category}</span>
                  ) : null}
                  {challengeObjectives.map((objective) => (
                    <span key={`${challenge.id}-${objective}`} className={`${styles.badge} ${styles.objectiveBadge}`}>
                      {OBJECTIVE_LABELS[objective] || objective}
                    </span>
                  ))}
                </div>

                <div className={styles.cardActions}>
                  <button
                    className={isSelected ? 'btn-secondary' : 'btn-primary'}
                    onClick={() => {
                      if (!isSelected) {
                        onSelect(challenge.id);
                      }
                    }}
                    disabled={isSelected}
                  >
                    {isSelected ? '✓ Ajoutée' : '+ Ajouter'}
                  </button>
                  {isSelected && (
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => onConfigure(challenge.id)}
                    >
                      ⚙ Configurer
                    </button>
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
