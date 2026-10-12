# Pixel Architect: Cross Bridge

The built-in `pont_croise` preset uses an 8 x 6 x 8 grid (X, height Y, Z)
and exactly 48 cubes:

- Lower deck: 16 cubes along X at Y=2, Z=3/4 (UI layer 3).
- Upper deck: 16 cubes along Z at Y=4, X=3/4 (UI layer 5).
- Lower supports: eight cubes at X=1/6, Z=3/4, Y=0/1.
- Upper supports: eight cubes at (X=3, Z=1) and (X=4, Z=6), Y=0..3.

All supports reach the ground. The central crossing has an empty layer
between the decks. Layer target counts are 6, 6, 18, 2, 16, 0.
Colors remain decorative; the existing position-based evaluation is unchanged.

The frontend and server use this geometry only for the exact new preset.
Existing in-memory rounds and custom templates with other dimensions/counts
retain the previous generator. When a new runtime configuration is created,
the old built-in 8 x 8 x 4 / 32-cube preset is upgraded to the new preset.
Replication of the new preset requires at least 48 cubes; the builder shows
this minimum and frontend/backend configuration normalization enforces it.
The default budget remains 50. Other presets and creative-mode budgets are
unchanged. No database migration or active-state rewrite is performed.

## Validation

From the frontend directory, with the app running on port 3100 and Chrome
available:

```sh
node scripts/test-pixel-cross-bridge-ux.mjs
```

This test uses the existing local API/Socket.IO fixture. It checks desktop FR
and mobile EN, with and without WebGL, exact frontend/server target equality,
navigation through every layer, absence of horizontal overflow, all 48
placement events and a perfect server evaluation. It does not certify a live
multiuser session against a real backend.

`SMOKE_FRONTEND_URL` overrides the frontend URL. `PIXEL_UX_ARTIFACT_DIR`
optionally saves screenshots for visual inspection.

From the backend directory:

```sh
npm test -- --runInBand tests/pixel_architect_runtime.test.js tests/challenge_engine_contract.test.js
```
