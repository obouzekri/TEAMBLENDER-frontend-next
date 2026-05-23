# Challenge Rules Flow QA

## Scope
Validate the unified UX flow across live challenges:
1. Before start: rules panel visible in challenge main block.
2. On start (Play on timer): rules panel disappears and gameplay view appears.
3. During game: rules are accessible via popup button.

Challenges covered:
- CoPuzzle Live
- Phrase Mystere
- Mission Critique
- Escape Room
- Vrai ou Mensonge
- Labyrinthe Live

## Functional Checklist

### Shared Behavior (all challenges)
- [ ] Pre-start rules panel is visible on initial challenge load.
- [ ] Gameplay controls are not interactable before timer start (except expected pre-start controls).
- [ ] Facilitator can start challenge from timer play control.
- [ ] Rules panel in main block disappears immediately after start.
- [ ] Rules button appears in side panel after start.
- [ ] Rules popup opens and closes with:
  - [ ] Close button
  - [ ] Click outside modal
  - [ ] Escape key
- [ ] Opening/closing rules popup does not reset challenge state.

### Facilitator Path
- [ ] Facilitator sees role-specific rules before start.
- [ ] Facilitator can start timer from Chrono card.
- [ ] Facilitator keeps access to rules popup while game is running.
- [ ] Facilitator can continue challenge actions after popup close.

### Participant Path
- [ ] Participant sees role-specific rules before start.
- [ ] Participant waits for facilitator start and cannot force game start.
- [ ] Participant sees gameplay view once timer starts.
- [ ] Participant can open rules popup during game without breaking interaction.

## Challenge-Specific Checks

### CoPuzzle Live
- [ ] Puzzle board hidden by rules panel before start.
- [ ] Puzzle board appears after start.
- [ ] Piece drag/drop still works after popup interactions.

### Phrase Mystere
- [ ] Slots view hidden by rules panel before start.
- [ ] Slots become active after start.
- [ ] Word drag/drop and slot placement still work after popup interactions.

### Mission Critique
- [ ] Timeline workspace hidden by rules panel before start.
- [ ] Timeline workspace appears after start.
- [ ] Drag/drop and submit timeline still work after popup interactions.

### Escape Room
- [ ] waiting_for_start shows rules panel.
- [ ] Start via timer play transitions to puzzle/enigma view.
- [ ] Submit/hint/skip still work after popup interactions.

### Vrai ou Mensonge
- [ ] waiting_start shows rules panel.
- [ ] Start via timer play transitions to first live phase.
- [ ] Vote/reveal flow still works after popup interactions.

### Labyrinthe Live
- [ ] Pre-start mission brief uses shared rules panel.
- [ ] Start transitions to game/facilitator monitoring view.
- [ ] Movement and vote actions still work after popup interactions.

## Device and Layout Checks
- [ ] Desktop: rules popup is centered and readable.
- [ ] Mobile: side controls remain reachable.
- [ ] Mobile: popup remains usable (scroll, close controls visible).

## Regression Checks
- [ ] Chat still sends/receives messages.
- [ ] Timer controls still behave as expected.
- [ ] No console error on start transition.
- [ ] No console error on popup open/close.

## Current Status (from code/build validation)
- Build status: PASS (next build)
- Static integration check: PASS (rules component wired in all targeted challenges)
- VOM utility test: PASS (test:unit:vom)
- Manual runtime validation in live session: PENDING

## Suggested Execution Order for Manual QA
1. CoPuzzle Live (facilitator + participant)
2. Phrase Mystere (facilitator + participant)
3. Mission Critique (facilitator + participant)
4. Escape Room (facilitator + participant)
5. Vrai ou Mensonge (facilitator + participant)
6. Labyrinthe Live (facilitator + participant)
