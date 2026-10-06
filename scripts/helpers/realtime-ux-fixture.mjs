import assert from 'node:assert/strict';

export async function createRealtimeFixture(browser, { baseUrl, locale, role, engineKey, state, viewport = { width: 1440, height: 1000 }, theme = 'light' }) {
  const context = await browser.newContext({ locale, viewport });
  const sockets = new Map();
  const receivedEvents = [];
  const challenge = { id: 7, name: engineKey, engine_key: engineKey };
  const send = (connection, packet) => {
    if (connection.pending) {
      const pending = connection.pending;
      connection.pending = null;
      pending(packet);
    } else {
      connection.queue.push(packet);
    }
  };
  const broadcast = (type, payload) => {
    for (const connection of sockets.values()) send(connection, `42${JSON.stringify(['challenge:event', { type, payload }])}`);
  };
  await context.addInitScript(({ language, userRole, colorTheme }) => {
    sessionStorage.setItem('jwt', 'local-realtime-fixture');
    sessionStorage.setItem('currentUser', JSON.stringify({ id: 1, role: userRole, first_name: 'sophie', last_name: 'bourger' }));
    localStorage.setItem('tb_locale_preference', language);
    localStorage.setItem('tb_theme', colorTheme);
  }, { language: locale, userRole: role, colorTheme: theme });
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.includes('/socket.io')) {
      const headers = { 'Access-Control-Allow-Origin': baseUrl, 'Access-Control-Allow-Credentials': 'true' };
      if (request.method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: { ...headers, 'Access-Control-Allow-Headers': '*' } });
        return;
      }
      const sid = url.searchParams.get('sid');
      if (!sid) {
        const id = `fixture-${sockets.size}`;
        sockets.set(id, { queue: [], pending: null });
        await route.fulfill({ headers, body: `0${JSON.stringify({ sid: id, upgrades: [], pingInterval: 60000, pingTimeout: 60000, maxPayload: 1000000 })}` });
        return;
      }
      const connection = sockets.get(sid);
      assert.ok(connection, `Unknown fixture socket ${sid}`);
      if (request.method() === 'POST') {
        for (const packet of (request.postData() || '').split('\x1e')) {
          if (packet.startsWith('40')) send(connection, `40${JSON.stringify({ sid })}`);
          if (packet.startsWith('42')) {
            const [event, payload] = JSON.parse(packet.slice(2));
            if (event === 'challenge:event') receivedEvents.push(payload);
            if (event === 'challenge:join' || (event === 'challenge:event' && ['laby.request_state', 'vom.request_state', 'mission.request_state'].includes(payload.type))) {
              send(connection, `42${JSON.stringify(['challenge:state', { state }])}`);
            }
          }
        }
        await route.fulfill({ headers, body: 'ok' });
      } else {
        const packet = connection.queue.length ? connection.queue.splice(0).join('\x1e') : await new Promise((resolve) => { connection.pending = resolve; });
        await route.fulfill({ headers, body: packet });
      }
      return;
    }
    if (url.pathname.includes('/api/')) {
      let payload = [];
      if (url.pathname.endsWith('/runtime-challenge')) payload = { engine_key: engineKey, challenge_id: 7, session_id: 42, config: state.config, context: { role, participantId: '1' } };
      else if (url.pathname.endsWith('/state')) payload = { status: 'en_cours', active_challenge_id: 7, current_challenge: challenge, challenges: [challenge] };
      else if (/\/sessions\/42$/.test(url.pathname)) payload = { id: 42, name: 'Realtime UX', status: 'en_cours', challenges: [challenge], assigned_participants: [] };
      await route.fulfill({ json: payload });
    } else if (url.origin === new URL(baseUrl).origin) {
      await route.continue();
    } else {
      await route.abort();
    }
  });
  const close = async () => {
    for (const connection of sockets.values()) {
      if (connection.pending) connection.pending('1');
    }
    await context.close();
  };
  return { context, broadcast, close, receivedEvents };
}
