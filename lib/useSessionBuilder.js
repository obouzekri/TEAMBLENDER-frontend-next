'use client';

import { useState, useCallback, useEffect } from 'react';

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
    category: '',
    objective: '',
    duration: ''
  });

  // Charger depuis localStorage au mount
  useEffect(() => {
    const saved = localStorage.getItem('selectedChallenges');
    if (saved) {
      try {
        setSelectedChallenges(JSON.parse(saved));
      } catch (err) {
        console.error('Erreur lors du chargement des sélections', err);
      }
    }
  }, []);

  // Sauvegarder quand selectedChallenges change
  useEffect(() => {
    localStorage.setItem('selectedChallenges', JSON.stringify(selectedChallenges));
  }, [selectedChallenges]);

  // Appliquer les filtres
  useEffect(() => {
    let filtered = allChallenges;

    if (filters.category) {
      filtered = filtered.filter((c) => c.category === filters.category);
    }
    if (filters.objective) {
      filtered = filtered.filter((c) => {
        // Gérer les deux formats: string (nouveau) et array (ancien)
        if (Array.isArray(c.objectives)) {
          return c.objectives.includes(filters.objective);
        }
        return c.objectives === filters.objective;
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

      return [...prev, { ...challenge, config: challenge.config || {} }];
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
    setFilters({ category: '', objective: '', duration: '' });
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
    setConfiguring,

    // Utilities
    getTotalDuration,
  };
};

export default useSessionBuilder;
