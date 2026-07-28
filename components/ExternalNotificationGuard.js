'use client';

import Script from 'next/script';

export default function ExternalNotificationGuard() {
  return (
    <Script id="teamblender-block-knock-websockets" strategy="beforeInteractive">
      {`
        (function () {
          if (typeof window === 'undefined' || window.__TEAMBLENDER_NOTIFICATION_GUARD__) return;
          window.__TEAMBLENDER_NOTIFICATION_GUARD__ = true;

          const originalWebSocket = window.WebSocket;
          if (!originalWebSocket) return;

          const blockedHosts = ['api.knock.app', 'knock.app'];

          function isBlockedSocketUrl(rawUrl) {
            if (!rawUrl) return false;
            try {
              const parsed = new URL(String(rawUrl), window.location.href);
              const host = String(parsed.hostname || '').toLowerCase();
              return blockedHosts.some((blockedHost) => host === blockedHost || host.endsWith('.' + blockedHost));
            } catch {
              return false;
            }
          }

          function createBlockedSocket() {
            return {
              readyState: 3,
              CONNECTING: 0,
              OPEN: 1,
              CLOSING: 2,
              CLOSED: 3,
              binaryType: '',
              bufferedAmount: 0,
              extensions: '',
              protocol: '',
              url: '',
              close() {},
              send() {},
              addEventListener() {},
              removeEventListener() {},
              dispatchEvent() { return false; },
              onopen: null,
              onmessage: null,
              onerror: null,
              onclose: null,
            };
          }

          window.WebSocket = function WebSocket(url, protocols) {
            if (isBlockedSocketUrl(url)) {
              if (typeof window.console?.info === 'function') {
                window.console.info('[TeamBlender] Blocked external notification websocket', String(url));
              }
              return createBlockedSocket();
            }
            return new originalWebSocket(url, protocols);
          };

          window.WebSocket.prototype = originalWebSocket.prototype;
          window.WebSocket.CONNECTING = originalWebSocket.CONNECTING;
          window.WebSocket.OPEN = originalWebSocket.OPEN;
          window.WebSocket.CLOSING = originalWebSocket.CLOSING;
          window.WebSocket.CLOSED = originalWebSocket.CLOSED;
        })();
      `}
    </Script>
  );
}
