import React, { useEffect } from 'react';
import { getStoredAuthToken, getStoredCurrentUser } from '@/lib/auth';

export function useManagerGuard() {
  const [state, setState] = React.useState({ loading: true, allowed: false, user: null });

  useEffect(() => {
    const token = getStoredAuthToken();
    const user = getStoredCurrentUser();

    if (!token || !user) {
      window.location.replace('/login');
      return;
    }

    if (user.role === 'participant') {
      window.location.replace('/participant');
      return;
    }

    setState({ loading: false, allowed: true, user });
  }, []);

  return state;
}
