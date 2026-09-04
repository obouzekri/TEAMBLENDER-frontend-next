'use client';

import { createContext, useContext } from 'react';

// Lets a per-engine ChallengeHeader render inside the unified SessionLiveHeader card
// instead of its own separate block. Value is the DOM node to portal into (or null).
export const ChallengeHeaderPortalContext = createContext(null);

export function useChallengeHeaderPortalNode() {
  return useContext(ChallengeHeaderPortalContext);
}
