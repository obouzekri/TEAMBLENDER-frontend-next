// In-browser stand-in for the realtime challenge server, used only by the public demo.
// It speaks the same Socket.IO protocol as the backend (challenge:join, challenge:event,
// challenge:state) so the real challenge components render unchanged. A scenario module
// owns the challenge state and scripts the fictional participants.

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
  const listeners = new Map();
  let state = scenario.createState();
  let joined = false;
  let ticker = null;
  let disposed = false;
  let chatCount = 0;
  const ctx = { role, participantId };

  function deliver(event, payload) {
    scheduler.setTimeout(() => {
      if (disposed) return;
      for (const callback of [...(listeners.get(event) || [])]) callback(payload);
    }, 0);
  }

  function view() {
    return scenario.view ? scenario.view(state, ctx) : state;
  }

  function pushState() {
    if (joined) deliver('challenge:state', { state: clone(view()), participantSlot });
  }

  function isRunning() {
    if (state.summary) return false;
    return scenario.isRunning ? scenario.isRunning(state) : state.timer?.status === 'running';
  }

  function syncTicker() {
    const running = isRunning();
    if (running && !ticker) {
      ticker = scheduler.setInterval(() => update(scenario.tick(state, ctx)), tickMs);
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

  function handleEvent(type, payload) {
    if (type.endsWith('request_state')) {
      pushState();
      return;
    }
    if (type === 'chat.message') {
      // Echoed to the room like the backend does, so the sender sees it confirmed.
      const text = String(payload?.text || '').trim();
      if (!text) return;
      chatCount += 1;
      deliver('challenge:event', {
        type: 'chat.message',
        payload: {
          id: `demo_msg_${chatCount}`,
          client_msg_id: String(payload?.client_msg_id || '').trim() || null,
          author: String(payload?.author || '').trim() || 'Participant',
          text,
          ts: new Date().toISOString(),
        },
      });
      return;
    }
    if (TIMER_EVENTS.has(type)) {
      const timed = applyTimerEvent(state, type);
      update(timed && scenario.onTimer ? scenario.onTimer(timed, type, ctx) : timed);
      return;
    }
    update(scenario.handleEvent ? scenario.handleEvent(state, type, payload || {}, ctx) : null);
  }

  const socket = {
    id: 'demo-socket',
    connected: true,
    on(event, callback) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(callback);
      return socket;
    },
    off(event, callback) {
      listeners.get(event)?.delete(callback);
      return socket;
    },
    emit(event, payload) {
      if (disposed) return false;
      if (event === 'challenge:join') {
        joined = true;
        pushState();
        syncTicker();
      } else if (event === 'challenge:event') {
        handleEvent(String(payload?.type || ''), payload?.payload);
      }
      return true;
    },
  };

  return {
    socket,
    getState: () => state,
    dispatch: (type, payload) => handleEvent(type, payload),
    dispose() {
      disposed = true;
      if (ticker) scheduler.clearInterval(ticker);
      ticker = null;
      listeners.clear();
    },
  };
}
