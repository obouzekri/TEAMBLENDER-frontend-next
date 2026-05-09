'use client';
import React, { useEffect, useMemo } from 'react';
import { toLegacy } from '@/lib/legacy';
import styles from './LocalPage.module.css';

export default function LocalPageChallenge({ engineKey, runtimePayload, socket, context }) {
  const route = useMemo(() => {
    const raw = runtimePayload?.config?.route;
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim().startsWith('/') ? raw.trim() : `/${raw.trim()}`;
    }
    return '/src/pages/home.html';
  }, [runtimePayload]);

  useEffect(() => {
    const target = toLegacy(route);
    const timer = window.setTimeout(() => {
      window.location.replace(target);
    }, 600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [route]);

  return (
    <div className={styles.localPageContainer}>
      <section className={styles.hero}>
        <h1>Contenu Local</h1>
        <p>Redirection vers la page legacy en cours...</p>
      </section>
      <div className={styles.placeholder}>
        <p>Engine: {engineKey}</p>
        <p>Route: {route}</p>
        <p>Si rien ne se passe, utilisez le lien ci-dessous.</p>
        <a className={styles.link} href={toLegacy(route)}>Ouvrir la page legacy</a>
      </div>
    </div>
  );
}