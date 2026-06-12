'use client';

import dynamic from 'next/dynamic';

const SessionBuilder = dynamic(() => import('./SessionBuilder'), {
  ssr: false, // Disable SSR for this component to avoid prerendering issues
  loading: () => <p>Loading...</p>
});

export default function SessionBuilderPage() {
  return <SessionBuilder />;
}
