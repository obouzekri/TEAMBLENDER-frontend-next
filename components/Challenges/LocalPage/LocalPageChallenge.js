'use client';
import React, { useMemo } from 'react';
import { toLegacy } from '@/lib/legacy';
import styles from './LocalPage.module.css';

export default function LocalPageChallenge({ engineKey, runtimePayload, socket, context }) {
  const legacyLinksEnabled = process.env.NEXT_PUBLIC_ENABLE_LEGACY_LINKS === 'true';

  const route = useMemo(() => {
    const raw = runtimePayload?.config?.route;
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim().startsWith('/') ? raw.trim() : `/${raw.trim()}`;
    }
    return '/src/pages/home.html';
  }, [runtimePayload]);

  return (
    <div className={styles.localPageContainer}>
      <section className={styles.hero}>
        <h1>Ouverture de la page locale</h1>
        <p>Le contenu legacy n'est pas redirige automatiquement pour eviter les erreurs 404 de port.</p>
      </section>
      <div className={styles.placeholder}>
        <p>Engine: {engineKey}</p>
        <p>Route: {route}</p>
        {legacyLinksEnabled ? (
          <>
            <p>Le mode legacy est active explicitement. Utilisez ce lien uniquement sur demande.</p>
            <a className={styles.link} href={toLegacy(route)}>Ouvrir la page legacy</a>
          </>
        ) : (
          <p>Le mode legacy est desactive par defaut. Activez NEXT_PUBLIC_ENABLE_LEGACY_LINKS=true uniquement sur demande explicite.</p>
        )}
      </div>
    </div>
  );
}