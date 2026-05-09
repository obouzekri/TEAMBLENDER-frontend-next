'use client';

import { useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const ChallengeWrapper = dynamic(
  () => import('@/components/Challenges/ChallengeWrapper'),
  { ssr: false, loading: () => <p>Chargement...</p> }
);

export default function ChallengeRouteClient() {
  const params = useParams();
  const searchParams = useSearchParams();

  const engineKey = useMemo(() => String(params?.engineKey || 'escape_room_v1'), [params]);
  const sessionId = useMemo(
    () => String(searchParams?.get('sessionId') || searchParams?.get('id') || ''),
    [searchParams]
  );

  return <ChallengeWrapper sessionId={sessionId} engineKey={engineKey} />;
}
