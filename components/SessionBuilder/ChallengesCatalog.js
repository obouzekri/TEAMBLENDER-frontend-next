'use client';

import SessionCardSkeleton from '@/components/SessionCardSkeleton';
import styles from './ChallengesCatalog.module.css';

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
  const categories = [
    { value: '', label: 'Tous' },
    { value: 'escape-game', label: 'Escape Game' },
    { value: 'logique-reflexion', label: 'Logique & Réflexion' },
    { value: 'icebreaker', label: 'Icebreaker' },
  ];

  const objectives = [
    { value: '', label: 'Tous' },
    { value: 'cohesion', label: 'Cohésion' },
    { value: 'communication', label: 'Communication' },
    { value: 'collaboration', label: 'Collaboration' },
    { value: 'leadership', label: 'Leadership' },
    { value: 'resolution-problemes', label: 'Résolution de problèmes' },
  ];

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
            const isLegacyOnly = String(challenge?.engine_key || '').trim() === 'local_page_v1';
            return (
              <div key={challenge.id} className={`${styles.card} ${isSelected ? styles.selected : ''}`}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>{challenge.name}</h3>
                  <span className={styles.cardDuration}>{challenge.duration}m</span>
                </div>

                <p className={styles.cardDescription}>{challenge.description}</p>

                {isLegacyOnly ? (
                  <p className={styles.cardDescription}>
                    Challenge legacy: indisponible sur Vercel tant que le frontend legacy n'est pas expose.
                  </p>
                ) : null}

                <div className={styles.cardMeta}>
                  <span className={styles.badge}>{challenge.category}</span>
                  <span className={styles.badge}>{challenge.objective}</span>
                </div>

                <div className={styles.cardActions}>
                  <button
                    className={isSelected ? 'btn-secondary' : 'btn-primary'}
                    onClick={() => {
                      if (!isSelected && !isLegacyOnly) {
                        onSelect(challenge.id);
                      }
                    }}
                    disabled={isSelected || isLegacyOnly}
                  >
                    {isSelected ? '✓ Ajoutée' : isLegacyOnly ? 'Legacy seulement' : '+ Ajouter'}
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
