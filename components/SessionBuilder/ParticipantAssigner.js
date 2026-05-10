'use client';

import styles from './ParticipantAssigner.module.css';
import { useState, useEffect } from 'react';

export default function ParticipantAssigner({ isLoading, onAssign, onCancel, onSkip }) {
  const [participants, setParticipants] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '';
    if (!token) {
      setLoadingParticipants(false);
      return;
    }

    setLoadingParticipants(true);
    fetch('/api/members', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Impossible de charger les participants');
        return res.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : data.data || data.members || [];
        setParticipants(list);
      })
      .catch((err) => {
        console.warn('Erreur chargement participants:', err.message);
        setParticipants([]);
      })
      .finally(() => {
        setLoadingParticipants(false);
      });
  }, []);

  const filteredParticipants = participants.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      String(p.name || '').toLowerCase().includes(term) ||
      String(p.email || '').toLowerCase().includes(term)
    );
  });

  const toggleParticipant = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelected(participants.map((p) => p.id));
  };

  const deselectAll = () => {
    setSelected([]);
  };

  const handleAssign = () => {
    onAssign(selected);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2>Assigner les participants</h2>
          <p className={styles.subtitle}>
            Sélectionnez les membres qui participeront à cette session
          </p>
        </div>

        {loadingParticipants ? (
          <div className={styles.loading}>
            <p>Chargement des participants...</p>
          </div>
        ) : (
          <>
            <div className={styles.searchBox}>
              <input
                type="text"
                placeholder="Rechercher par nom ou email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.input}
              />
            </div>

            {participants.length === 0 ? (
              <div className={styles.empty}>
                <p>Aucun participant disponible</p>
                <small>Créez d'abord des participants dans l'administration</small>
              </div>
            ) : (
              <>
                <div className={styles.controls}>
                  <button
                    type="button"
                    onClick={selectAll}
                    className={styles.btnLink}
                  >
                    Tout sélectionner
                  </button>
                  <span className={styles.divider}>•</span>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className={styles.btnLink}
                  >
                    Tout désélectionner
                  </button>
                </div>

                <div className={styles.list}>
                  {filteredParticipants.map((participant) => (
                    <label key={participant.id} className={styles.item}>
                      <input
                        type="checkbox"
                        checked={selected.includes(participant.id)}
                        onChange={() => toggleParticipant(participant.id)}
                      />
                      <div className={styles.info}>
                        <strong>{participant.name || 'Sans nom'}</strong>
                        {participant.email && (
                          <span className={styles.email}>{participant.email}</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                <div className={styles.summary}>
                  <span className={styles.count}>
                    {selected.length} sélectionné{selected.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </>
            )}

            <div className={styles.actions}>
              <button
                type="button"
                onClick={onCancel}
                className={styles.btnSecondary}
                disabled={isLoading}
              >
                Annuler
              </button>
              {participants.length > 0 && (
                <button
                  type="button"
                  onClick={onSkip}
                  className={styles.btnTertiary}
                  disabled={isLoading}
                >
                  Passer
                </button>
              )}
              <button
                type="button"
                onClick={handleAssign}
                className={styles.btnPrimary}
                disabled={isLoading || selected.length === 0}
              >
                {isLoading ? 'Assignation...' : 'Assigner'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
