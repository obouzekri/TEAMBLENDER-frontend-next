// Copy of backend/src/challenges/engines/pixel_architect_v1/server-runtime.js (ES module syntax, with
// clampInt inlined from shared/state-helpers.js). Keep it in sync with the backend.
// Pixel Architecte challenge engine: 3D grid state, evaluation and claims.
// Pure state transforms - no Socket.IO/io access.
function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function buildInitialPixelState(config) {
  const templates = Array.isArray(config?.templates) ? config.templates : [];
  const selectedTemplateId = String(config?.replication?.templateId || '').trim();
  const selectedTemplate = templates.find((item) => String(item?.id || '').trim() === selectedTemplateId) || templates[0] || null;
  const gridX = clampInt(selectedTemplate?.max_dims?.x, 8, 4, 20);
  const gridY = clampInt(selectedTemplate?.max_dims?.y, 8, 4, 20);
  const gridZ = clampInt(selectedTemplate?.max_dims?.z, 5, 2, 10);
  const maxCubes = clampInt(config?.settings?.maxCubes, 50, 8, 400);
  const maxColors = clampInt(config?.settings?.maxColors, 3, 1, 6);
  const templatePalette = Array.isArray(selectedTemplate?.palette)
    ? selectedTemplate.palette.map((item) => String(item || '').trim().toUpperCase()).filter(Boolean)
    : [];
  const configPalette = Array.isArray(config?.palette)
    ? config.palette.map((item) => String(item || '').trim().toUpperCase()).filter(Boolean)
    : [];
  const paletteSource = templatePalette.length > 0 ? templatePalette : configPalette;
  const palette = (paletteSource.length > 0 ? paletteSource : ['#2D9CDB', '#27AE60', '#F2C94C']).slice(0, maxColors);

  const pixelState = {
    phase: 'intro',
    mode: String(config?.mode || 'replication').toLowerCase() === 'creatif' ? 'creatif' : 'replication',
    collaboration_mode: String(config?.collaborationMode || 'standard').toLowerCase() === 'avance' ? 'avance' : 'standard',
    grid: { x: gridX, y: gridY, z: gridZ },
    max_cubes: maxCubes,
    remaining_cubes: maxCubes,
    palette,
    cubes: {},
    placed_count: 0,
    hints_enabled: config?.settings?.hintsEnabled !== false,
    hints_used: 0,
    hints: [],
    selected_template: selectedTemplate,
    creative_theme: String(config?.creative?.theme || '').trim(),
    final_submissions: {},
    evaluation: null,
    layer_claims: {},
    zone_claims: {}
  };

  rebuildPixelCounters(pixelState);
  return pixelState;
}

function buildPixelTemplateCells(template) {
  const maxX = clampInt(template?.max_dims?.x, 8, 4, 20);
  const maxY = clampInt(template?.max_dims?.y, 8, 4, 20);
  const maxZ = clampInt(template?.max_dims?.z, 5, 2, 10);
  const targetCount = clampInt(template?.target_cube_count, 24, 8, 300);

  // Preserve legacy/in-progress and custom targets; only the new preset uses this geometry.
  if (String(template?.id || '').trim() === 'pont_croise'
    && maxX === 8 && maxY === 6 && maxZ === 8 && targetCount === 48) {
    const cells = [];
    for (let position = 0; position < 8; position += 1) {
      for (const center of [3, 4]) {
        cells.push({ x: position, y: 2, z: center });
        cells.push({ x: center, y: 4, z: position });
      }
    }
    for (const x of [1, 6]) {
      for (const z of [3, 4]) {
        for (let y = 0; y < 2; y += 1) cells.push({ x, y, z });
      }
    }
    for (const { x, z } of [{ x: 3, z: 1 }, { x: 4, z: 6 }]) {
      for (let y = 0; y < 4; y += 1) cells.push({ x, y, z });
    }
    return cells.map((item) => `${item.x}:${item.y}:${item.z}`);
  }

  const cx = (maxX - 1) / 2;
  const cz = (maxZ - 1) / 2;
  const coords = [];

  for (let y = 0; y < maxY; y += 1) {
    for (let x = 0; x < maxX; x += 1) {
      for (let z = 0; z < maxZ; z += 1) {
        const radial = Math.hypot(x - cx, z - cz);
        const tierBias = y * 0.42;
        coords.push({ x, y, z, score: radial + tierBias });
      }
    }
  }

  coords.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (a.y !== b.y) return a.y - b.y;
    if (a.x !== b.x) return a.x - b.x;
    return a.z - b.z;
  });

  return coords.slice(0, targetCount).map((item) => `${item.x}:${item.y}:${item.z}`);
}

function buildPixelEvaluation(pixel) {
  const cubes = pixel && typeof pixel.cubes === 'object' ? pixel.cubes : {};
  const placedKeys = Object.keys(cubes);
  const templateKeys = buildPixelTemplateCells(pixel?.selected_template);
  const targetSet = new Set(templateKeys);
  const targetCount = Math.max(1, targetSet.size);
  const matchedCount = placedKeys.reduce((count, key) => count + (targetSet.has(key) ? 1 : 0), 0);
  const extraCount = placedKeys.reduce((count, key) => count + (targetSet.has(key) ? 0 : 1), 0);
  const missingCount = Math.max(0, targetSet.size - matchedCount);
  const accuracyPercent = Math.round(Math.max(0, Math.min(100, (matchedCount / targetCount) * 100)));

  return {
    target_count: targetSet.size,
    matched_count: matchedCount,
    missing_count: missingCount,
    extra_count: extraCount,
    accuracy_percent: accuracyPercent,
    completion_percent: accuracyPercent,
    perfect_match: matchedCount === targetSet.size && extraCount === 0 && targetSet.size > 0
  };
}

// The author's display name is stored with the cube so the facilitator's team panel can show it.
function buildPixelCube({ x, y, z, color, participantId, displayName, ts }) {
  return {
    x,
    y,
    z,
    color,
    placed_by: String(participantId || '').trim(),
    placed_by_name: String(displayName || '').trim(),
    ts
  };
}

function rebuildPixelCounters(pixel) {
  const placedCount = Object.keys(pixel?.cubes || {}).length;
  pixel.placed_count = placedCount;
  pixel.remaining_cubes = Math.max(0, Number(pixel?.max_cubes || 0) - placedCount);
  pixel.evaluation = buildPixelEvaluation(pixel);
}

function cleanupPixelLayerClaims(pixel, participantId = '') {
  if (!pixel || !pixel.layer_claims || typeof pixel.layer_claims !== 'object') return false;
  const ownerId = String(participantId || '').trim();
  let changed = false;

  Object.keys(pixel.layer_claims).forEach((layerKey) => {
    const claim = pixel.layer_claims[layerKey];
    if (!claim || String(claim.participant_id || '').trim() !== ownerId) return;
    delete pixel.layer_claims[layerKey];
    changed = true;
  });

  return changed;
}

function cleanupPixelZoneClaims(pixel, participantId = '') {
  if (!pixel || !pixel.zone_claims || typeof pixel.zone_claims !== 'object') return false;
  const ownerId = String(participantId || '').trim();
  let changed = false;

  Object.keys(pixel.zone_claims).forEach((zoneKey) => {
    const claim = pixel.zone_claims[zoneKey];
    if (!claim || String(claim.participant_id || '').trim() !== ownerId) return;
    delete pixel.zone_claims[zoneKey];
    changed = true;
  });

  return changed;
}

function resolvePixelViewerRole(state, participantId, canControlTimer) {
  if (canControlTimer) return 'facilitator';
  const participantKey = String(participantId || '').trim();
  const architectIds = Array.isArray(state?.config?.advancedRoles?.architectParticipantIds)
    ? state.config.advancedRoles.architectParticipantIds.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  if (architectIds.includes(participantKey)) return 'architect';
  return 'builder';
}

function buildPixelPayloadForSocket(state, participantId, canControlTimer) {
  const pixel = state?.pixel || buildInitialPixelState(state?.config || {});
  const viewerRole = resolvePixelViewerRole(state, participantId, canControlTimer);
  const isAdvancedReplication = pixel.collaboration_mode === 'avance' && pixel.mode === 'replication';
  const canSeeTemplate = !isAdvancedReplication || canControlTimer || viewerRole === 'architect';

  return {
    ...pixel,
    viewer_role: viewerRole,
    selected_template: canSeeTemplate ? pixel.selected_template : null
  };
}

export {
  buildInitialPixelState,
  buildPixelTemplateCells,
  buildPixelEvaluation,
  buildPixelCube,
  rebuildPixelCounters,
  cleanupPixelLayerClaims,
  cleanupPixelZoneClaims,
  resolvePixelViewerRole,
  buildPixelPayloadForSocket,
};
