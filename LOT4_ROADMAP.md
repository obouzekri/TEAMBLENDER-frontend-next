# LOT 4: Live Challenges Migration

## Overview

Lot 4 migrates real-time, interactive challenge experiences from vanilla HTML to Next.js. This includes:
- **6 challenge engines**: escape_room_v1, phrase_collaborative_v1, copuzzle_live_v1, labyrinthe_live_v1, icebreaker_v1, local_page_v1
- **WebSocket/Socket.io integration** for real-time state synchronization
- **Facilitator + Participant views** for each challenge
- **Runtime challenge engine** JS library (backend-agnostic)

---

## Challenge Engines Overview

| Engine | Type | Real-time | Roles | Status |
|--------|------|-----------|-------|--------|
| **escape_room_v1** | Puzzle solving | Yes (Socket.io) | Facilitator, Participants | ⏳ To Migrate |
| **phrase_collaborative_v1** | Word placement | Yes (Socket.io) | Facilitator, Participants | ⏳ To Migrate |
| **copuzzle_live_v1** | Live puzzle | Yes (Socket.io) | Participants | ⏳ To Migrate |
| **labyrinthe_live_v1** | Maze solving | Yes (Socket.io) | Participants | ⏳ To Migrate |
| **icebreaker_v1** | Quick questions | Yes (Socket.io) | Participants | ⏳ In Progress (Lot 1-2) |
| **local_page_v1** | Static content | No (Redirect) | Any | ✅ Complete (Fallback) |

---

## Architecture Plan

### Layer 1: WebSocket Connection (Socket.io)
- **Location**: `frontend-next/lib/socket.js`
- **Responsibilities**:
  - Establish Socket.io connection to `/api/challenges/socket`
  - Emit/listen for challenge events: `challenge:join`, `challenge:event`, `challenge:completed`
  - Auto-reconnect with exponential backoff
  - Handle connection errors gracefully

### Layer 2: Challenge Runtime Library
- **Location**: `frontend-next/lib/challenges/runtime.js`
- **Responsibilities**:
  - Expose `mountRuntimeChallenge(engineKey, config, context)` function
  - Delegate to engine-specific modules (escape_room, phrase_collaborative, etc.)
  - Manage local state for challenge (current slot, answers, timer, etc.)
  - Emit events to Socket.io when user interacts

### Layer 3: Engine-Specific Modules
- **Location**: `frontend-next/components/Challenges/<EngineName>/`
- **Structure** (per engine):
  ```
  components/Challenges/
    ├── EscapeRoom/
    │   ├── EscapeRoomChallenge.js (Main component)
    │   ├── Enigma.js (Individual puzzle display)
    │   ├── Facilitator.js (Controls, hints, timer)
    │   └── EscapeRoom.module.css
    ├── PhraseCoop/
    │   ├── PhraseChallenge.js
    │   ├── Grid.js
    │   ├── Facilitator.js
    │   └── PhraseCoop.module.css
    ├── CopuzzleLive/
    │   ├── CopuzzleChallenge.js
    │   ├── Facilitator.js
    │   └── Copuzzle.module.css
    └── ... (more engines)
  ```

### Layer 4: Challenge Pages (Next.js Routes)
- **Location**: `frontend-next/app/challenges/[engineKey]/page.js`
- **Dynamic routes**:
  ```
  /challenges/escape-room?sessionId=123&role=facilitator
  /challenges/phrase-collaborative?sessionId=123&role=participant
  /challenges/copuzzle-live?sessionId=123
  /challenges/labyrinthe-live?sessionId=123
  ```

---

## Implementation Phases

### Phase 1: Socket.io Integration & Infrastructure
**Goal**: Establish real-time communication layer

**Tasks**:
1. ✅ Backend: Verify Socket.io server is running on `/api/challenges/socket`
2. Create `frontend-next/lib/socket.js` with:
   - `useSocket()` hook for consuming Socket.io in React
   - Connection state management (connecting, connected, disconnected, error)
   - Auto-reconnect logic with exponential backoff (1s, 2s, 4s, 8s)
   - Typed event emitters/listeners
3. Create `frontend-next/lib/challenges/runtime.js` with:
   - `mountRuntimeChallenge(engineKey, runtimePayload, socket, context)`
   - Dispatch logic to engine-specific components
4. Create base `frontend-next/components/Challenges/ChallengeWrapper.js`:
   - Fetch session/challenge runtime from `/api/sessions/:id/runtime-challenge`
   - Establish Socket.io connection
   - Detect facilitator vs participant from `context.role`
   - Pass to engine-specific component

**Deliverables**:
- Socket.io connection working in React
- Challenge runtime payload flowing to components
- No UI yet, just data plumbing

**Testing**:
- Connect from browser, verify Socket.io handshake in DevTools Network
- Emit test event, verify backend receives it

---

### Phase 2: Escape Room Engine Migration
**Goal**: Migrate first complete engine (most complex, highest value)

**Why first?**:
- Largest user impact
- Complex multi-enigma state management
- Demonstrates facilitator + participant architecture

**Tasks**:
1. Create `/app/challenges/escape-room/page.js` (server wrapper)
2. Create `components/Challenges/EscapeRoom/EscapeRoomChallenge.js` (main client component)
3. Implement state management:
   - Current enigma index
   - Participant answers (per enigma)
   - Timer state
   - Hints used
4. Create `components/Challenges/EscapeRoom/Enigma.js`:
   - Display puzzle (image + description + answer field)
   - Handle answer submission → emit `challenge:event` with payload
5. Create `components/Challenges/EscapeRoom/EscapeRoomFacilitator.js`:
   - Start/pause timer
   - Give hints to specific participants
   - Advance to next enigma
   - View all participant progress
6. Integrate Socket.io listeners:
   - Listen for `challenge:state` → update enigma state
   - Listen for `challenge:event` → handle other participant actions
   - Listen for `challenge:error` → show error toast
7. Styling: Convert vanilla CSS to CSS Modules

**Deliverables**:
- Escape room fully playable in Next.js
- Facilitator can control timer and hints
- Participants see real-time updates
- No image assets missing

**Testing**:
- Browser: Open facilitator view + 2 participant views
- Answer enigma 1 in participant view
- Verify facilitator sees answer submitted
- Facilitator gives hint, participants see it
- Timer works

---

### Phase 3: Phrase Collaborative Engine Migration
**Goal**: Migrate word placement real-time challenge

**Tasks**:
1. Create `/app/challenges/phrase-collaborative/page.js`
2. Implement `components/Challenges/PhraseCoop/PhraseChallenge.js`:
   - Grid display of empty slots
   - Word bank (draggable words or buttons)
   - Slot placement (click-to-place or drag-drop)
   - Emit `challenge:event` on word placement
3. Implement real-time grid sync:
   - Listen for `challenge:state` with all participant placements
   - Update grid to show all words placed by team
   - Handle word conflicts/overwrites
4. Implement `components/Challenges/PhraseCoop/PhraseFacilitator.js`:
   - Timer controls
   - Show phrase answer/solution
   - View all participant contributions
   - Option to clear grid / reset
5. Styling: CSS Modules with animations for word placement

**Deliverables**:
- Phrase collaborative fully playable
- Real-time word placement visible to all participants
- Facilitator can reset/advance

**Testing**:
- 3 participant views place words simultaneously
- Verify all see each other's placements in real-time
- Facilitator resets, all participants see grid clear

---

### Phase 4: Copuzzle & Labyrinthe Engines
**Goal**: Migrate remaining "live" competitive challenges

**Tasks** (similar structure to Phase 2-3):
1. Copuzzle: Puzzle piece placement with scoring
2. Labyrinthe: Maze navigation with timer

**Deliverables**:
- Both engines playable
- Scoring/ranking visible
- Facilitator controls working

---

### Phase 5: Icebreaker & Local Pages Integration
**Goal**: Connect quick-fire questions and static content

**Tasks**:
1. Icebreaker: Integrate existing Icebreaker component (likely already in Next.js from Lot 1-2)
2. Local pages: Redirect fallback for static content (no migration needed)

**Deliverables**:
- All 6 engines integrated
- Fallback redirect for unsupported engines

---

## Technical Decisions

### Socket.io vs Polling
- ✅ **Socket.io**: Used by backend, required for real-time
- Established connection pooling, built-in reconnect
- Browser support: Works in all modern + IE11 (if needed)

### State Management: React Context vs Redux
- ✅ **React Context** (useReducer):
  - Simple 2-3 piece state per engine
  - Avoid Redux overhead for this scope
  - Easier to reason about Socket.io event flow

### CSS: Vanilla CSS vs CSS Modules vs Tailwind
- ✅ **CSS Modules**:
  - Consistent with existing frontend-next approach
  - Component-scoped (no conflicts)
  - Existing styles can be adapted

### Facilitator Authorization
- URL param `?role=facilitator` vs JWT claim
- ✅ **Hybrid**:
  - JWT `role` claim is source of truth
  - URL param is visual hint only
  - Server validates authorization in Socket.io namespace middleware

---

## API Integration Points

### 1. Session Runtime Fetch
```javascript
GET /api/sessions/:sessionId/runtime-challenge
Authorization: Bearer <jwt>

Response:
{
  engine_key: "escape_room_v1",
  config: {
    enigmes: [...],
    timer: { duration_seconds: 600 }
  },
  context: {
    role: "facilitator|participant",
    userId: 123,
    sessionId: 456
  }
}
```

### 2. Socket.io Events
**Client → Server:**
- `challenge:join { sessionId, userId, role }`
- `challenge:event { type, payload }` (answer submitted, hint requested, etc.)

**Server → Client:**
- `challenge:state { engineState }` (broadcast to all)
- `challenge:event { userId, type, payload }` (specific event from another participant)
- `challenge:error { message }`
- `challenge:completed { scores, winners }`

### 3. Challenge Response Submission
```javascript
POST /api/sessions/:sessionId/challenge-responses
Authorization: Bearer <jwt>
Body:
{
  challenge_id: 123,
  engine_key: "escape_room_v1",
  type: "enigma_solved",
  payload: { enigma_id: "e1", answer: "ANSWER" }
}
```

---

## File Structure (Target)

```
frontend-next/
├── lib/
│   ├── socket.js (Socket.io hook + connection manager)
│   ├── challenges/
│   │   ├── runtime.js (Engine dispatcher)
│   │   └── engines/ (Engine-specific business logic)
│   │       ├── escape-room.js
│   │       ├── phrase-collaborative.js
│   │       ├── copuzzle.js
│   │       └── labyrinthe.js
│   └── api.js (existing, update for challenge endpoints)
├── components/
│   ├── Challenges/
│   │   ├── ChallengeWrapper.js (Page wrapper)
│   │   ├── ChallengeLoader.js (Loading state)
│   │   ├── EscapeRoom/
│   │   │   ├── EscapeRoomChallenge.js
│   │   │   ├── Enigma.js
│   │   │   ├── EscapeRoomFacilitator.js
│   │   │   └── EscapeRoom.module.css
│   │   ├── PhraseCoop/
│   │   ├── CopuzzleLive/
│   │   └── LabyrintheLive/
│   └── ... (other shared components)
├── app/
│   ├── challenges/
│   │   ├── [engineKey]/
│   │   │   └── page.js (Dynamic route)
│   │   ├── page.js (Challenge picker/redirector)
│   │   └── error.js (Error boundary)
│   └── ... (existing pages)
└── ... (existing structure)
```

---

## Rollout Strategy

### Development
- Build + test each engine in isolation
- Use mock Socket.io responses for offline dev
- Gradually integrate with real backend

### Staging
- Full load test with 10+ concurrent participants
- Latency simulation (real network delays)
- Facilitator control stress test

### Production
- Canary: 10% of sessions use Next.js challenges
- Monitor: Error rates, latency, Socket.io connection stability
- Rollback: Fallback to legacy endpoints if needed

---

## Known Risks & Mitigation

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Socket.io connection drop** | High | Auto-reconnect + offline queue + error toast |
| **Stale UI during network lag** | Medium | Optimistic updates + reconciliation on state sync |
| **Facilitator loses connection mid-session** | High | Server-side session persistence + reconnect handler |
| **Browser doesn't support WebSocket** | Low | Socket.io has fallback transports (polling) |
| **Challenge engine bug blocks all users** | High | Try/catch around engine rendering + error fallback |
| **Real-time latency > 500ms** | Medium | UX feedback (loading spinner, "waiting for server...") |

---

## Success Criteria

✅ **Lot 4 Phase 1** (Infrastructure):
- Socket.io connection works in browser
- Challenge runtime payload flows correctly
- No runtime errors in console

✅ **Lot 4 Phase 2-4** (Engines):
- All 6 engines playable end-to-end
- Facilitator + Participant views work
- Real-time updates visible within 200ms
- No data loss during gameplay
- Error handling + graceful fallback

✅ **Final Validation**:
- Build passes: `npm run build` in frontend-next
- Tests pass: `npm test -- --runInBand` in backend
- E2E flow: Create session → Configure challenges → Launch → Play → Scores → Complete

---

## Next Immediate Steps

1. **Right now**: Backend verification
   - Confirm `/api/challenges/socket` Socket.io endpoint is running
   - Verify `GET /api/sessions/:id/runtime-challenge` returns valid payload
   - Ensure Socket.io event schema is documented

2. **Phase 1 (tomorrow)**:
   - Create `lib/socket.js` with useSocket hook
   - Create `lib/challenges/runtime.js` dispatcher
   - Create `components/Challenges/ChallengeWrapper.js`
   - Create `/app/challenges/[engineKey]/page.js` dynamic route
   - Test Socket.io handshake from browser

3. **Phase 2 (this week)**:
   - Migrate escape_room_v1 engine
   - Full end-to-end test with 2+ participants

4. **Phases 3-5 (next week)**:
   - Remaining engines
   - Integration + load testing

---

## Documentation & References

- Backend Socket.io server: `backend/server.js` (search for `io.on('connection')`)
- Challenge engines: `backend/src/challenges/engines/*/index.js`
- Vanilla UI examples: `frontend/src/pages/challenges/*.html`
- Runtime challenge JS: `frontend/src/challenges/runtime/challenge-runtime.js`

---

## Owner & Dates

- **Owner**: Copilot Agent (Session: 2026-05-09)
- **Target Completion**: End of sprint (2026-05-16)
- **Status**: 🟡 Planning Phase

