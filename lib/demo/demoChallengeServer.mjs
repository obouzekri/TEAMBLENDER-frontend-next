// In-browser stand-in for the realtime challenge server, used only by the public demo.
// It speaks the same Socket.IO protocol as the backend (challenge:join, challenge:event,
// challenge:state) so the real challenge components render unchanged. A scenario module
// owns the challenge state and scripts the fictional participants.
// Several clients can connect to one game (facilitator and participant side by side); each
// receives the view of its own role, like separate sockets on the backend.

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

const TIMER_EVENTS = new Set(['timer.start', 'timer.pause', 'timer.resume']);

export function applyTimerEvent(state, type) {
  const status = state?.timer?.status;
  if (!state?.timer || state.timer.enabled === false || state.summary) return null;
  if (type === 'timer.start' && status === 'idle') return { ...state, timer: { ...state.timer, status: 'running' } };
  if (type === 'timer.pause' && status === 'running') return { ...state, timer: { ...state.timer, status: 'paused' } };
  if (type === 'timer.resume' && status === 'paused') return { ...state, timer: { ...state.timer, status: 'running' } };
  return null;
}

export function createDemoChallengeServer({
  scenario,
  role = 'manager',
  participantId = 'demo-facilitator',
  participantSlot = null,
  tickMs = 300,
  onSummary,
  scheduler = globalThis,
}) {
  const clients = new Set();
  let state = scenario.createState();
  let ticker = null;
  let disposed = false;
  let chatCount = 0;
  let socketCount = 0;

  function deliver(client, event, payload) {
    scheduler.setTimeout(() => {
      if (disposed || !clients.has(client)) return;
      for (const callback of [...(client.listeners.get(event) || [])]) callback(payload);
    }, 0);
  }

  function pushStateTo(client) {
    if (!client.joined) return;
    const view = scenario.view ? scenario.view(state, client.ctx) : state;
    deliver(client, 'challenge:state', { state: clone(view), participantSlot: client.participantSlot });
  }

  function pushState() {
    for (const client of clients) pushStateTo(client);
  }

  function isRunning() {
    if (state.summary) return false;
    return scenario.isRunning ? scenario.isRunning(state) : state.timer?.status === 'running';
  }

  function syncTicker() {
    const running = isRunning();
    if (running && !ticker) {
      ticker = scheduler.setInterval(() => update(scenario.tick(state)), tickMs);
    } else if (!running && ticker) {
      scheduler.clearInterval(ticker);
      ticker = null;
    }
  }

  function update(next) {
    if (disposed || !next || next === state) return;
    const wasFinished = Boolean(state.summary);
    state = next;
    pushState();
    syncTicker();
    if (!wasFinished && state.summary) onSummary?.(state.summary, state);
  }

  // `client` is null for events the demo itself dispatches (auto-start), which act as the facilitator.
  function handleEvent(client, type, payload) {
    const ctx = client?.ctx || primary.ctx;
    if (type.endsWith('request_state')) {
      if (client) pushStateTo(client);
      else pushState();
      return;
    }
    if (type === 'chat.message') {
      // Echoed to the whole room like the backend does, so the sender sees it confirmed.
      const text = String(payload?.text || '').trim();
      if (!text) return;
      chatCount += 1;
      const message = {
        type: 'chat.message',
        payload: {
          id: `demo_msg_${chatCount}`,
          client_msg_id: String(payload?.client_msg_id || '').trim() || null,
          author: String(payload?.author || '').trim() || 'Participant',
          text,
          ts: new Date().toISOString(),
        },
      };
      for (const target of clients) deliver(target, 'challenge:event', message);
      return;
    }
    if (TIMER_EVENTS.has(type)) {
      // Only the facilitator drives the timer, as on the backend.
      if (client && ctx.role === 'participant') return;
      const timed = applyTimerEvent(state, type);
      update(timed && scenario.onTimer ? scenario.onTimer(timed, type, ctx) : timed);
      return;
    }
    update(scenario.handleEvent ? scenario.handleEvent(state, type, payload || {}, ctx) : null);
  }

  // Opens a socket on the shared game for one viewer.
  function connect(options = {}) {
    socketCount += 1;
    const client = {
      listeners: new Map(),
      joined: false,
      participantSlot: options.participantSlot ?? null,
      ctx: {
        role: options.role || 'manager',
        participantId: options.participantId || 'demo-facilitator',
        participantSlot: options.participantSlot ?? null,
      },
    };
    clients.add(client);
    const socket = {
      id: `demo-socket-${socketCount}`,
      connected: true,
      on(event, callback) {
        if (!client.listeners.has(event)) client.listeners.set(event, new Set());
        client.listeners.get(event).add(callback);
        return socket;
      },
      off(event, callback) {
        client.listeners.get(event)?.delete(callback);
        return socket;
      },
      emit(event, payload) {
        if (disposed || !clients.has(client)) return false;
        if (event === 'challenge:join') {
          client.joined = true;
          pushStateTo(client);
          syncTicker();
        } else if (event === 'challenge:event') {
          handleEvent(client, String(payload?.type || ''), payload?.payload);
        }
        return true;
      },
      disconnect() {
        socket.connected = false;
        clients.delete(client);
        client.listeners.clear();
        return socket;
      },
    };
    client.socket = socket;
    return socket;
  }

  const primarySocket = connect({ role, participantId, participantSlot });
  const primary = [...clients][0];

  return {
    socket: primarySocket,
    connect,
    getState: () => state,
    getView: (ctx) => (scenario.view ? scenario.view(state, ctx) : state),
    dispatch: (type, payload) => handleEvent(null, type, payload),
    dispose() {
      disposed = true;
      if (ticker) scheduler.clearInterval(ticker);
      ticker = null;
      for (const client of clients) client.listeners.clear();
      clients.clear();
    },
  };
}
