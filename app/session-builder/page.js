'use client';

import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const SessionBuilder = dynamic(() => import('./SessionBuilder'), {
  ssr: false, // Disable SSR for this component to avoid prerendering issues
  loading: () => <p>Chargement...</p>
});

export default function SessionBuilderPage() {
  return <SessionBuilder />;
}
