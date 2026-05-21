'use client';

import { useMemo } from 'react';
import SessionCardSkeleton from '@/components/SessionCardSkeleton';
import styles from './ChallengesCatalog.module.css';

// Mapping des valeurs techniques aux labels affichés
const CATEGORY_LABELS = {
  'escape-game': 'Escape Game',
  'logique-reflexion': 'Logique & Réflexion',
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
};

export default function ChallengesCatalog({
  challenges,
  selectedIds,
  filters,
  isLoading,
  onSelect,
  onConfigure,
  onFilterChange,
  onResetFilters,
}) {
  // Extraire les catégories uniques depuis les challenges
  const categories = useMemo(() => {
    const unique = new Set();
    challenges.forEach((c) => {
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
  }, [challenges]);

  // Extraire les objectifs uniques depuis les challenges
  // Gérer les deux formats: string (nouveau) et array (ancien)
  const objectives = useMemo(() => {
    const unique = new Set();
    challenges.forEach((c) => {
      if (Array.isArray(c.objectives)) {
        // Format ancien: array
        c.objectives.forEach((obj) => {
          if (obj) unique.add(obj);
        });
      } else if (c.objectives) {
        // Format nouveau: string
        unique.add(c.objectives);
      }
    });
    
    const sorted = Array.from(unique).sort();
    return [
      { value: '', label: 'Tous' },
      ...sorted.map((obj) => ({
        value: obj,
        label: OBJECTIVE_LABELS[obj] || obj,
      })),
    ];
  }, [challenges]);

  const durations = [
    { value: '', label: 'Tous' },
    { value: 'short', label: 'Moins de 10 min' },
    { value: 'medium', label: '10-20 min' },
    { value: 'long', label: 'Plus de 20 min' },
  ];

  return (
    <section className={styles.catalog}>
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label className={styles.filterField}>
            <span className={styles.filterLabel}>Catégories</span>
            <select
              value={filters.category}
              onChange={(e) => onFilterChange({ category: e.target.value })}
              className={styles.filterSelect}
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.filterField}>
            <span className={styles.filterLabel}>Objectif</span>
            <select
              value={filters.objective}
              onChange={(e) => onFilterChange({ objective: e.target.value })}
              className={styles.filterSelect}
            >
              {objectives.map((obj) => (
                <option key={obj.value} value={obj.value}>
                  {obj.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.filterField}>
            <span className={styles.filterLabel}>Durée</span>
            <select
              value={filters.duration}
              onChange={(e) => onFilterChange({ duration: e.target.value })}
              className={styles.filterSelect}
            >
              {durations.map((dur) => (
                <option key={dur.value} value={dur.value}>
                  {dur.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.filterActions}>
          <button className="btn-secondary btn-sm" onClick={onResetFilters}>
            ↻ Réinitialiser
          </button>
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
            return (
              <div key={challenge.id} className={`${styles.card} ${isSelected ? styles.selected : ''}`}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>{challenge.name}</h3>
                  <span className={styles.cardDuration}>{challenge.duration}m</span>
                </div>

                <p className={styles.cardDescription}>{challenge.description}</p>

                <div className={styles.cardMeta}>
                  <span className={styles.badge}>{challenge.category}</span>
                  <span className={styles.badge}>{challenge.objective}</span>
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
    </section>
  );
}
