'use client';

import { useState, useCallback, useEffect } from 'react';

const MAX_FILTER_OBJECTIVES = 3;

function toObjectiveList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  const raw = String(value || '').trim();
  if (!raw) return [];
  return raw.split(',').map((item) => item.trim()).filter(Boolean);
}

function parseChallengeDuration(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) {
    return 0;
  }

  const numeric = raw.match(/\d+(?:[.,]\d+)?/g) || [];
  if (numeric.length === 0) {
    return 0;
  }

  const values = numeric.map((item) => Number.parseFloat(item.replace(',', '.'))).filter(Number.isFinite);
  if (values.length === 0) {
    return 0;
  }

  if (values.length >= 2 && /-|to|à|au/.test(raw)) {
    return values.slice(0, 2).reduce((sum, item) => sum + item, 0) / 2;
  }

  return values[0];
}

/**
 * useSessionBuilder - State management pour Session Builder
 * Gère: challenges sélectionnés, filtres, configuration
 */
const useSessionBuilder = () => {
  const [allChallenges, setAllChallenges] = useState([]);
  const [selectedChallenges, setSelectedChallenges] = useState([]);
  const [filteredChallenges, setFilteredChallenges] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [configuring, setConfiguring] = useState(null);

  const [filters, setFilters] = useState({
    categories: [],
    objectives: [],
    duration: ''
  });

  // Appliquer les filtres
  useEffect(() => {
    let filtered = allChallenges;

    if (Array.isArray(filters.categories) && filters.categories.length > 0) {
      filtered = filtered.filter((c) => filters.categories.includes(c.category));
    }
    if (Array.isArray(filters.objectives) && filters.objectives.length > 0) {
      filtered = filtered.filter((c) => {
        const challengeObjectives = toObjectiveList(c.objectives);
        return filters.objectives.some((objective) => challengeObjectives.includes(objective));
      });
    }
    if (filters.duration) {
      filtered = filtered.filter((c) => {
        // Extraire la durée numérique
        let dur = 0;
        if (typeof c.duration === 'number') {
          dur = c.duration;
        } else if (typeof c.duration === 'string') {
          // Format ancien: "20-25 min" => prendre le premier nombre
          const match = c.duration.match(/(\d+)/);
          dur = match ? Number(match[1]) : 0;
        }
        
        if (filters.duration === 'short') return dur < 10;
        if (filters.duration === 'medium') return dur >= 10 && dur <= 20;
        if (filters.duration === 'long') return dur > 20;
        return true;
      });
    }

    setFilteredChallenges(filtered);
  }, [allChallenges, filters]);

  const selectChallenge = useCallback((challengeId) => {
    setSelectedChallenges((prev) => {
      const exists = prev.find((c) => c.id === challengeId);
      if (exists) return prev;

      const challenge = allChallenges.find((c) => c.id === challengeId);
      if (!challenge) return prev;

      const baseConfig = challenge?.engine_config && typeof challenge.engine_config === 'object'
        ? challenge.engine_config
        : {};
      const directConfig = challenge?.config && typeof challenge.config === 'object'
        ? challenge.config
        : {};
      const challengeConfig = {
        ...baseConfig,
        ...directConfig,
        image: { ...(baseConfig.image || {}), ...(directConfig.image || {}) },
        grid: { ...(baseConfig.grid || {}), ...(directConfig.grid || {}) },
        timer: { ...(baseConfig.timer || {}), ...(directConfig.timer || {}) },
        chat: { ...(baseConfig.chat || {}), ...(directConfig.chat || {}) },
        participants: { ...(baseConfig.participants || {}), ...(directConfig.participants || {}) },
      };

      return [...prev, { ...challenge, config: challengeConfig }];
    });
  }, [allChallenges]);

  const deselectChallenge = useCallback((challengeId) => {
    setSelectedChallenges((prev) => prev.filter((c) => c.id !== challengeId));
  }, []);

  const updateChallengeConfig = useCallback((challengeId, config) => {
    setSelectedChallenges((prev) =>
      prev.map((c) =>
        c.id === challengeId ? { ...c, config } : c
      )
    );
    setConfiguring(null);
  }, []);

  const moveChallengeUp = useCallback((challengeId) => {
    setSelectedChallenges((prev) => {
      const index = prev.findIndex((c) => c.id === challengeId);
      if (index <= 0) return prev;

      const newList = [...prev];
      [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
      return newList;
    });
  }, []);

  const moveChallengeDown = useCallback((challengeId) => {
    setSelectedChallenges((prev) => {
      const index = prev.findIndex((c) => c.id === challengeId);
      if (index >= prev.length - 1) return prev;

      const newList = [...prev];
      [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
      return newList;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSelectedChallenges([]);
  }, []);

  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ categories: [], objectives: [], duration: '' });
  }, []);

  const toggleCategoryFilter = useCallback((category) => {
    const value = String(category || '').trim();
    if (!value) return;
    setFilters((prev) => {
      const current = Array.isArray(prev.categories) ? prev.categories : [];
      const exists = current.includes(value);
      return {
        ...prev,
        categories: exists ? current.filter((item) => item !== value) : [...current, value],
      };
    });
  }, []);

  const toggleObjectiveFilter = useCallback((objective) => {
    const value = String(objective || '').trim();
    if (!value) return;
    setFilters((prev) => {
      const current = Array.isArray(prev.objectives) ? prev.objectives : [];
      const exists = current.includes(value);
      if (exists) {
        return {
          ...prev,
          objectives: current.filter((item) => item !== value),
        };
      }
      if (current.length >= MAX_FILTER_OBJECTIVES) {
        return prev;
      }
      return {
        ...prev,
        objectives: [...current, value],
      };
    });
  }, []);

  const getTotalDuration = useCallback(() => {
    return selectedChallenges.reduce((sum, challenge) => {
      const configDuration = challenge?.config?.duration ?? challenge?.config?.duration_minutes;
      const challengeDuration = challenge?.duration ?? configDuration ?? 0;
      return sum + parseChallengeDuration(challengeDuration);
    }, 0);
  }, [selectedChallenges]);

  return {
    // State
    allChallenges,
    selectedChallenges,
    filteredChallenges,
    filters,
    isLoading,
    error,
    configuring,

    // Actions
    setAllChallenges,
    setIsLoading,
    setError,
    selectChallenge,
    deselectChallenge,
    updateChallengeConfig,
    moveChallengeUp,
    moveChallengeDown,
    clearAll,
    updateFilters,
    resetFilters,
    toggleCategoryFilter,
    toggleObjectiveFilter,
    setConfiguring,

    // Utilities
    getTotalDuration,
  };
};

export default useSessionBuilder;
