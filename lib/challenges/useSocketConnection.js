'use client';

import { useEffect, useState } from 'react';

export default function useSocketConnection(socket) {
  const [connected, setConnected] = useState(Boolean(socket?.connected));
  useEffect(() => {
    const update = () => setConnected(Boolean(socket?.connected));
    update();
    socket?.on('connect', update);
    socket?.on('disconnect', update);
    return () => {
      socket?.off('connect', update);
      socket?.off('disconnect', update);
    };
  }, [socket]);
  return connected;
}
