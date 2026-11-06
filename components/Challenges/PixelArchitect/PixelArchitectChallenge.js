'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import useFacilitatorTimerControls from '@/lib/challenges/useFacilitatorTimerControls';
import useModalFocus from '@/lib/useModalFocus';
import { refreshChallengeStateBeforeStart } from '@/lib/challenges/useRealtimeChallenge';
import useChallengeChat from '@/lib/challenges/useChallengeChat';
import { DEFAULT_CHALLENGE_QUICK_MESSAGES } from '@/lib/challenges/chat-presets';
import { getPixelArchitectRulesPreset } from '@/lib/challenges/pixelArchitectRules';
import ChallengeTimerCard from '../ChallengeTimerCard';
import ChallengeChatCard from '../ChallengeChatCard';
import ChallengeRulesPanel from '../ChallengeRulesPanel';
import ChallengeHeader from '../ChallengeHeader';
import ChallengePresentation from '../ChallengePresentation';
import ChallengeDebriefHeading from '../ChallengeDebriefHeading';
import useI18n from '@/lib/i18n/useI18n';
import styles from './PixelArchitect.module.css';

const DEFAULT_TEMPLATE = Object.freeze({
  id: 'tour_signal',
  name: 'Tour Signal',
  difficulty: 'facile',
  max_dims: { x: 6, y: 6, z: 4 },
  target_cube_count: 24,
  palette: ['#2F80ED', '#27AE60', '#F2994A'],
});

const FALLBACK_PALETTE = Object.freeze(['#2D9CDB', '#27AE60', '#F2C94C']);
const COLOR_LABELS = Object.freeze({
  '#2D9CDB': 'Bleu clair',
  '#2F80ED': 'Bleu azur',
  '#27AE60': 'Vert emeraude',
  '#F2C94C': 'Jaune solaire',
  '#F2994A': 'Orange corail',
});
function toCellKey(x, y, z) {
  return `${x}:${y}:${z}`;
}

function getCellWorldPosition(x, y, z, gridSize) {
  const offset = (gridSize - 1) / 2;
  return new THREE.Vector3(x - offset, y + 0.5, z - offset);
}

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function describeColor(color) {
  const hex = String(color || '').trim().toUpperCase();
  return `${COLOR_LABELS[hex] || 'Couleur'} ${hex}`.trim();
}

function normalizeGrid(pixel, selectedTemplate) {
  const x = clampInt(pixel?.grid?.x, clampInt(selectedTemplate?.max_dims?.x, 8, 4, 20), 4, 20);
  const y = clampInt(pixel?.grid?.y, clampInt(selectedTemplate?.max_dims?.y, 8, 4, 20), 4, 20);
  const z = clampInt(pixel?.grid?.z, clampInt(selectedTemplate?.max_dims?.z, 5, 2, 10), 2, 10);
  return { x, y, z };
}

function buildTemplateCells(template) {
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
    return cells;
  }

  const cx = (maxX - 1) / 2;
  const cz = (maxZ - 1) / 2;
  const coords = [];

  for (let y = 0; y < maxY; y += 1) {
    for (let x = 0; x < maxX; x += 1) {
      for (let z = 0; z < maxZ; z += 1) {
        const radial = Math.hypot(x - cx, z - cz);
        const tierBias = y * 0.42;
        const score = radial + tierBias;
        coords.push({ x, y, z, score });
      }
    }
  }

  coords.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (a.y !== b.y) return a.y - b.y;
    if (a.x !== b.x) return a.x - b.x;
    return a.z - b.z;
  });

  return coords.slice(0, targetCount).map((item) => ({ x: item.x, y: item.y, z: item.z }));
}

function normalizeServerCubes(cubesMap) {
  return Object.values(cubesMap || {})
    .map((cube) => ({
      x: Number(cube?.x),
      y: Number(cube?.y),
      z: Number(cube?.z),
      color: String(cube?.color || '').trim() || '#22c55e',
      placedBy: String(cube?.placed_by || '').trim(),
      placedByName: String(cube?.placed_by_name || '').trim(),
      ts: String(cube?.ts || '').trim(),
    }))
    .filter((cube) => Number.isInteger(cube.x) && Number.isInteger(cube.y) && Number.isInteger(cube.z));
}

function buildLayerBoard(grid, layer, targetSet, cubesByKey) {
  return Array.from({ length: grid.z }, (_, z) => (
    Array.from({ length: grid.x }, (_, x) => {
      const key = toCellKey(x, layer, z);
      const cube = cubesByKey.get(key) || null;
      return {
        x,
        z,
        key,
        cube,
        isTarget: targetSet.has(key),
        isPlaced: Boolean(cube),
      };
    })
  ));
}

function mountMiniModelScene(container, { gridSize, grid, palette, targetCells, onUnavailable }) {
  const width = Math.max(120, container.clientWidth || 168);
  const height = Math.max(80, container.clientHeight || 96);

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
  camera.position.set(gridSize + 1.5, Math.max(5, grid.y + 1), gridSize + 1.5);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  } catch (error) {
    onUnavailable(error);
    return () => {};
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.4;
  controls.target.set(0, Math.max(1.2, grid.y / 3), 0);
  controls.update();

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.72);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.95);
  keyLight.position.set(5, 8, 6);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x7dd3fc, 0.35);
  fillLight.position.set(-5, 5, -4);
  scene.add(fillLight);

  const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
  const group = new THREE.Group();
  scene.add(group);

  targetCells.forEach((cell, index) => {
    const color = palette[index % Math.max(1, palette.length)] || '#7dd3fc';
    const cube = new THREE.Mesh(
      cubeGeometry,
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color).multiplyScalar(0.25),
        emissiveIntensity: 0.25,
        roughness: 0.34,
        metalness: 0.14,
      })
    );
    cube.position.copy(getCellWorldPosition(cell.x, cell.y, cell.z, gridSize));
    group.add(cube);
  });

  const animate = () => {
    controls.update();
    renderer.render(scene, camera);
    return window.requestAnimationFrame(animate);
  };

  let frameId = animate();

  const onResize = () => {
    const nextWidth = Math.max(120, container.clientWidth || 168);
    const nextHeight = Math.max(80, container.clientHeight || 96);
    camera.aspect = nextWidth / nextHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(nextWidth, nextHeight);
  };

  window.addEventListener('resize', onResize);

  return () => {
    window.removeEventListener('resize', onResize);
    window.cancelAnimationFrame(frameId);
    group.children.forEach((mesh) => {
      if (mesh.material) mesh.material.dispose();
    });
    cubeGeometry.dispose();
    controls.dispose();
    renderer.dispose();
    if (container.contains(renderer.domElement)) {
      container.removeChild(renderer.domElement);
    }
  };
}

export default function PixelArchitectChallenge({ runtimePayload, socket, context, onChallengeCompleted }) {
  const { locale, t } = useI18n();
  const rulesPreset = useMemo(() => getPixelArchitectRulesPreset(locale), [locale]);
  const mountRef = useRef(null);
  const modelPreviewRef = useRef(null);
  const modelPreviewMobileRef = useRef(null);
  const audioContextRef = useRef(null);
  const sceneApiRef = useRef(null);
  const canInteractRef = useRef(false);
  const activeLayerRef = useRef(0);
  const selectedColorRef = useRef(FALLBACK_PALETTE[0]);

  const [activeLayer, setActiveLayer] = useState(0);
  const [selectedColor, setSelectedColor] = useState(FALLBACK_PALETTE[0]);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const [isViewportReady, setIsViewportReady] = useState(false);
  const [isModelSidebarOpen, setIsModelSidebarOpen] = useState(false);
  const [viewportError, setViewportError] = useState('');
  const [isModelMapOpen, setIsModelMapOpen] = useState(false);
  const modelDialogRef = useRef(null);
  useModalFocus(isModelMapOpen, modelDialogRef, () => setIsModelMapOpen(false));
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const hasAutoSelectedStartLayerRef = useRef(false);

  function selectColor(color) {
    const nextColor = String(color || '').trim();
    if (!nextColor) return;
    selectedColorRef.current = nextColor;
    setSelectedColor(nextColor);
  }

  const { state, error, isFacilitator, emitEvent, connected } = useRealtimeChallenge({
    runtimePayload,
    socket,
    context,
    onChallengeCompleted,
  });
  const [isContributorStatsOpen, setIsContributorStatsOpen] = useState(false);
  const [isHintHistoryOpen, setIsHintHistoryOpen] = useState(false);
  const timerControls = useFacilitatorTimerControls({ socket, emitEvent, state, isFacilitator });

  const pixel = state?.pixel || null;
  const timer = state?.timer || null;
  const timerEnabled = timer?.enabled !== false;
  const timerStatus = String(timer?.status || 'idle').trim().toLowerCase();
  const hasChallengeStarted = timer?.enabled === false || ['running', 'paused', 'completed', 'stopped', 'timeout'].includes(timerStatus);
  const phase = String(pixel?.phase || '').trim().toLowerCase();
  const isLockedByPhase = ['debrief', 'fin'].includes(phase);
  const canBuild = connected && !isFacilitator && !isLockedByPhase && (!timerEnabled || timerStatus === 'running' || timerStatus === 'paused');

  const selectedTemplate = useMemo(() => {
    if (pixel?.selected_template && typeof pixel.selected_template === 'object') {
      return pixel.selected_template;
    }
    const templates = Array.isArray(state?.config?.templates) ? state.config.templates : [];
    const configuredTemplateId = String(state?.config?.replication?.templateId || '').trim();
    if (configuredTemplateId) {
      const found = templates.find((item) => String(item?.id || '').trim() === configuredTemplateId);
      if (found) return found;
    }
    return templates[0] || DEFAULT_TEMPLATE;
  }, [pixel?.selected_template, state?.config]);

  const grid = useMemo(() => normalizeGrid(pixel, selectedTemplate), [pixel, selectedTemplate]);
  const gridSize = Math.max(grid.x, grid.z);

  const palette = useMemo(() => {
    const fromPixel = Array.isArray(pixel?.palette) ? pixel.palette : [];
    const fromTemplate = Array.isArray(selectedTemplate?.palette) ? selectedTemplate.palette : [];
    const normalized = [...fromPixel, ...fromTemplate]
      .map((item) => String(item || '').trim())
      .filter(Boolean);
    return normalized.length > 0 ? Array.from(new Set(normalized)).slice(0, 6) : [...FALLBACK_PALETTE];
  }, [pixel?.palette, selectedTemplate?.palette]);

  const targetCells = useMemo(() => buildTemplateCells(selectedTemplate), [selectedTemplate]);
  const serverEvaluation = pixel?.evaluation || null;
  const targetCubeCount = clampInt(serverEvaluation?.target_count, selectedTemplate?.target_cube_count || targetCells.length || 24, 1, 400);
  const targetSet = useMemo(
    () => new Set(targetCells.map((cell) => toCellKey(cell.x, cell.y, cell.z))),
    [targetCells]
  );

  const serverCubes = useMemo(() => normalizeServerCubes(pixel?.cubes), [pixel?.cubes]);
  const layers = useMemo(() => {
    const allLayers = Array.from({ length: grid.y }, (_, index) => index);
    if (pixel?.mode === 'creatif') return allLayers;
    const usedLayers = new Set([...targetCells, ...serverCubes].map((cell) => cell.y));
    return allLayers.filter((layer) => usedLayers.has(layer));
  }, [grid.y, pixel?.mode, serverCubes, targetCells]);
  const activeLayerIndex = Math.max(0, layers.indexOf(activeLayer));
  const safeLayer = layers[activeLayerIndex] ?? 0;
  const cubesByKey = useMemo(() => {
    const map = new Map();
    serverCubes.forEach((cube) => {
      map.set(toCellKey(cube.x, cube.y, cube.z), cube);
    });
    return map;
  }, [serverCubes]);
  const layerClaims = pixel?.layer_claims && typeof pixel.layer_claims === 'object' ? pixel.layer_claims : {};
  const cubeCount = Number(pixel?.placed_count || serverCubes.length || 0);
  const remainingCubes = Math.max(0, Number(pixel?.remaining_cubes || 0));
  const completionRatio = Math.max(
    0,
    Math.min(
      100,
      Math.round(Number(serverEvaluation?.completion_percent || (cubeCount / Math.max(1, targetCubeCount)) * 100))
    )
  );
  const progress = completionRatio;

  const canSeeTargetModel = true;

  const displayName = useMemo(() => {
    const payloadName = String(runtimePayload?.context?.displayName || runtimePayload?.context?.name || '').trim();
    if (payloadName) return payloadName;
    const contextName = String(context?.displayName || context?.name || '').trim();
    if (contextName) return contextName;
    return 'Participant';
  }, [runtimePayload, context]);

  const rulesContent = useMemo(() => ({
    objective: rulesPreset.objective,
    facilitator: [...rulesPreset.facilitator],
    participant: [...rulesPreset.participant],
    footnote: rulesPreset.footnote,
  }), [rulesPreset]);
  const challengeName = String(rulesPreset?.challengeName || 'Pixel Architect').trim();
  const challengeSubtitle = String(rulesPreset?.subtitle || '').trim();
  const rulesParticipantsMeta = useMemo(() => ({
    min: rulesPreset.participants.min,
    recommended: rulesPreset.participants.recommended,
    max: rulesPreset.participants.max,
  }), [rulesPreset]);

  const { chatInput, setChatInput, chatMessages, submitChat, sendQuickChat, chatDelivery } = useChallengeChat({
    socket,
    emitEvent,
    author: displayName,
    enabled: state?.config?.chat?.enabled !== false,
    maxMessages: 100,
    maxLength: 240,
  });

  function onRequestHint() {
    if (isFacilitator) {
      emitEvent('pixel.request_hint');
    }
  }

  useEffect(() => {
    if (!palette.includes(selectedColor)) {
      setSelectedColor(palette[0] || FALLBACK_PALETTE[0]);
    }
  }, [palette, selectedColor]);

  useEffect(() => {
    selectedColorRef.current = selectedColor;
  }, [selectedColor]);

  useEffect(() => {
    if (activeLayer !== safeLayer) {
      setActiveLayer(safeLayer);
    }
  }, [activeLayer, safeLayer]);

  useEffect(() => {
    canInteractRef.current = canBuild;
  }, [canBuild]);

  useEffect(() => {
    activeLayerRef.current = safeLayer;
    if (sceneApiRef.current?.setLayer) {
      sceneApiRef.current.setLayer(safeLayer);
    }
  }, [safeLayer]);

  useEffect(() => {
    if (!mountRef.current) return () => {};

    setIsViewportReady(false);
    setViewportError('');
    setWebglUnavailable(false);

    const container = mountRef.current;
    const width = Math.max(320, container.clientWidth || 900);
    const height = Math.max(320, container.clientHeight || 520);

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 200);
    camera.position.set(gridSize + 2, Math.max(8, grid.y + 2), gridSize + 2);

    const renderer = (() => {
      try {
        const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        return r;
      } catch {
        setWebglUnavailable(true);
        setViewportError(t('challengePixel.n3dRenderingIsUnavailableOnThis'));
        return null;
      }
    })();
    if (!renderer) return () => {};
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const onWebglContextLost = (event) => {
      event.preventDefault();
      setWebglUnavailable(true);
      setViewportError(t('challengePixel.webglContextWasLostContinueWith'));
    };

    renderer.domElement.addEventListener('webglcontextlost', onWebglContextLost);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 1.5, 0);
    controls.update();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.52);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(8, 12, 9);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x7dd3fc, 0.32);
    fillLight.position.set(-8, 6, -7);
    scene.add(fillLight);

    const gridHelper = new THREE.GridHelper(gridSize, gridSize, 0x9cc5dc, 0x5f7f93);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    const boundsGeometry = new THREE.BoxGeometry(grid.x, grid.y, grid.z);
    const boundsEdges = new THREE.EdgesGeometry(boundsGeometry);
    const bounds = new THREE.LineSegments(
      boundsEdges,
      new THREE.LineBasicMaterial({ color: 0x7fa6c2, transparent: true, opacity: 0.26 })
    );
    bounds.position.set(0, grid.y / 2, 0);
    scene.add(bounds);

    const planeMaterial = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
    const interactionPlane = new THREE.Mesh(new THREE.PlaneGeometry(gridSize, gridSize), planeMaterial);
    interactionPlane.rotation.x = -Math.PI / 2;
    interactionPlane.position.y = safeLayer;
    scene.add(interactionPlane);

    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);

    const targetGroup = new THREE.Group();
    const playerGroup = new THREE.Group();
    scene.add(targetGroup);
    scene.add(playerGroup);

    const targetMap = new Map();
    const playerMap = new Map();

    const targetMaterial = new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.35,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.34,
      metalness: 0.1,
      roughness: 0.35,
    });

    const previewCube = new THREE.Mesh(
      cubeGeometry,
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(selectedColor),
        transparent: true,
        opacity: 0.28,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.22,
      })
    );
    previewCube.visible = false;
    scene.add(previewCube);

    const hoverCellRef = { value: null };
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const planeNormal = new THREE.Vector3(0, 1, 0);
    const planePoint = new THREE.Vector3(0, safeLayer, 0);
    const interactionMathPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePoint);
    const planeHitPoint = new THREE.Vector3();

    const playTone = (kind) => {
      try {
        const contextAudio = audioContextRef.current || new window.AudioContext();
        audioContextRef.current = contextAudio;
        const oscillator = contextAudio.createOscillator();
        const gain = contextAudio.createGain();
        oscillator.type = kind === 'remove' ? 'triangle' : 'sine';
        oscillator.frequency.value = kind === 'remove' ? 210 : 390;
        gain.gain.value = 0.0001;
        oscillator.connect(gain);
        gain.connect(contextAudio.destination);
        const now = contextAudio.currentTime;
        gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
        oscillator.start(now);
        oscillator.stop(now + 0.12);
      } catch {
        // Ignore audio errors on browsers that block autoplay contexts.
      }
    };

    const syncTargetCells = (cells) => {
      const nextMap = new Map();
      (Array.isArray(cells) ? cells : []).forEach((item) => {
        const key = toCellKey(item.x, item.y, item.z);
        nextMap.set(key, item);

        if (!targetMap.has(key)) {
          const cube = new THREE.Mesh(cubeGeometry, targetMaterial.clone());
          cube.position.copy(getCellWorldPosition(item.x, item.y, item.z, gridSize));
          cube.userData.cellKey = key;
          cube.userData.kind = 'target';
          targetGroup.add(cube);
          targetMap.set(key, cube);
        }
      });

      Array.from(targetMap.keys()).forEach((key) => {
        if (nextMap.has(key)) return;
        const cube = targetMap.get(key);
        if (cube) {
          targetGroup.remove(cube);
          if (cube.material) cube.material.dispose();
        }
        targetMap.delete(key);
      });
    };

    const syncServerCubes = (cubes) => {
      const nextMap = new Map();
      (Array.isArray(cubes) ? cubes : []).forEach((item) => {
        const key = toCellKey(item.x, item.y, item.z);
        nextMap.set(key, item);
        const isTargetCell = targetSet.has(key);

        if (!playerMap.has(key)) {
          const cube = new THREE.Mesh(
            cubeGeometry,
            new THREE.MeshStandardMaterial({
              color: new THREE.Color(item.color || '#22c55e'),
              emissive: isTargetCell ? '#0f3e24' : '#5f1720',
              emissiveIntensity: isTargetCell ? 0.18 : 0.28,
              roughness: 0.42,
              metalness: 0.08,
            })
          );
          cube.position.copy(getCellWorldPosition(item.x, item.y, item.z, gridSize));
          cube.scale.set(0.1, 0.1, 0.1);
          cube.userData.cellKey = key;
          cube.userData.kind = 'player';
          cube.userData.spawnAt = performance.now();
          cube.userData.x = item.x;
          cube.userData.y = item.y;
          cube.userData.z = item.z;
          playerGroup.add(cube);
          playerMap.set(key, cube);
        }

        const existing = playerMap.get(key);
        if (existing && existing.material) {
          existing.material.color.set(new THREE.Color(item.color || '#22c55e'));
          existing.material.emissive.set(isTargetCell ? '#0f3e24' : '#5f1720');
          existing.material.emissiveIntensity = isTargetCell ? 0.18 : 0.28;
          existing.userData.x = item.x;
          existing.userData.y = item.y;
          existing.userData.z = item.z;
        }
      });

      Array.from(playerMap.keys()).forEach((key) => {
        if (nextMap.has(key)) return;
        const cube = playerMap.get(key);
        if (cube) {
          playerGroup.remove(cube);
          if (cube.material) cube.material.dispose();
        }
        playerMap.delete(key);
      });
    };

    const setLayer = (layer) => {
      const safePlaneLayer = Number(layer);
      interactionPlane.position.y = safePlaneLayer;
      planePoint.set(0, safePlaneLayer, 0);
      interactionMathPlane.setFromNormalAndCoplanarPoint(planeNormal, planePoint);
    };

    const setPreviewColor = (color) => {
      if (!previewCube.material) return;
      previewCube.material.color.set(new THREE.Color(color || '#7dd3fc'));
    };

    const toLocalPointer = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const isInside = (x, y, z) => x >= 0 && x < grid.x && y >= 0 && y < grid.y && z >= 0 && z < grid.z;

    const resolveGridCell = (point) => {
      const offset = (gridSize - 1) / 2;
      const x = Math.round(point.x + offset);
      const y = Math.round(activeLayerRef.current);
      const z = Math.round(point.z + offset);
      if (!isInside(x, y, z)) return null;
      return { x, y, z, key: toCellKey(x, y, z) };
    };

    const onPointerMove = (event) => {
      toLocalPointer(event);
      raycaster.setFromCamera(pointer, camera);
      const planeHit = raycaster.ray.intersectPlane(interactionMathPlane, planeHitPoint);
      const gridCell = planeHit ? resolveGridCell(planeHitPoint) : null;
      hoverCellRef.value = gridCell;

      if (!gridCell || playerMap.has(gridCell.key) || !canInteractRef.current) {
        previewCube.visible = false;
        return;
      }
      previewCube.visible = true;
      previewCube.position.copy(getCellWorldPosition(gridCell.x, gridCell.y, gridCell.z, gridSize));
    };

    let pointerDownPos = null;

    const onPointerDown = (event) => {
      if (!canInteractRef.current) return;
      pointerDownPos = { clientX: event.clientX, clientY: event.clientY };
    };

    const onPointerUp = (event) => {
      if (!canInteractRef.current || !pointerDownPos) {
        pointerDownPos = null;
        return;
      }
      const dx = event.clientX - pointerDownPos.clientX;
      const dy = event.clientY - pointerDownPos.clientY;
      pointerDownPos = null;
      if (Math.hypot(dx, dy) > 6) return; // drag → orbit, not a click

      toLocalPointer(event);
      raycaster.setFromCamera(pointer, camera);
      const cubeHit = raycaster.intersectObjects([...playerGroup.children], false)[0] || null;

      if (cubeHit?.object?.userData?.kind === 'player') {
        const x = Number(cubeHit.object?.userData?.x);
        const y = Number(cubeHit.object?.userData?.y);
        const z = Number(cubeHit.object?.userData?.z);
        if (Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(z)) {
          playTone('remove');
          emitEvent('pixel.cube.remove', { x, y, z });
        }
        return;
      }

      const planeCell = raycaster.ray.intersectPlane(interactionMathPlane, planeHitPoint)
        ? resolveGridCell(planeHitPoint)
        : null;
      const cell = planeCell || hoverCellRef.value;
      if (!cell) return;
      if (playerMap.has(cell.key)) return;
      playTone('place');
      emitEvent('pixel.cube.place', { x: cell.x, y: cell.y, z: cell.z, color: selectedColorRef.current });
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      const w = Math.max(320, container.clientWidth || 900);
      const h = Math.max(320, container.clientHeight || 520);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', onResize);

    let rafId = 0;
    let hasRenderedFrame = false;
    const animate = () => {
      rafId = window.requestAnimationFrame(animate);
      controls.update();

      playerGroup.children.forEach((cube) => {
        if (!cube.userData.spawnAt) return;
        const elapsed = (performance.now() - cube.userData.spawnAt) / 180;
        const t = Math.min(1, elapsed);
        const scale = 0.1 + t * 0.9;
        cube.scale.set(scale, scale, scale);
      });

      try {
        renderer.render(scene, camera);
        if (!hasRenderedFrame) {
          hasRenderedFrame = true;
          setIsViewportReady(true);
        }
      } catch {
        setViewportError(t('challengePixel.n3dViewFailedToRenderPlease'));
        setWebglUnavailable(true);
      }
    };
    animate();

    sceneApiRef.current = {
      setLayer,
      setPreviewColor,
      syncServerCubes,
      syncTargetCells,
    };

    sceneApiRef.current.syncTargetCells(targetCells);
    sceneApiRef.current.syncServerCubes(serverCubes);
    sceneApiRef.current.setPreviewColor(selectedColor);
    sceneApiRef.current.setLayer(activeLayerRef.current);
    window.requestAnimationFrame(() => {
      onResize();
    });

    return () => {
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('webglcontextlost', onWebglContextLost);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      window.cancelAnimationFrame(rafId);

      playerMap.forEach((cube) => {
        if (cube.material) cube.material.dispose();
      });
      targetMap.forEach((cube) => {
        if (cube.material) cube.material.dispose();
      });
      targetGroup.children.forEach((cube) => {
        if (cube.material) cube.material.dispose();
      });
      cubeGeometry.dispose();
      targetMaterial.dispose();
      boundsGeometry.dispose();
      boundsEdges.dispose();
      controls.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      sceneApiRef.current = null;
    };
  }, [emitEvent, grid.x, grid.y, grid.z, gridSize]);

  useEffect(() => {
    if (!sceneApiRef.current) return;
    sceneApiRef.current.syncTargetCells(targetCells);
  }, [targetCells]);

  useEffect(() => {
    if (!sceneApiRef.current) return;
    sceneApiRef.current.syncServerCubes(serverCubes);
  }, [serverCubes]);

  useEffect(() => {
    if (!sceneApiRef.current) return;
    sceneApiRef.current.setPreviewColor(selectedColor);
  }, [selectedColor]);

  useEffect(() => {
    if (!hasChallengeStarted) {
      hasAutoSelectedStartLayerRef.current = false;
      return;
    }
    if (hasAutoSelectedStartLayerRef.current) return;
    hasAutoSelectedStartLayerRef.current = true;
    setActiveLayer(0);
  }, [hasChallengeStarted]);

  useEffect(() => {
    if (isFacilitator && !isModelSidebarOpen) return () => {};
    if (!modelPreviewRef.current || !canSeeTargetModel || webglUnavailable) return () => {};
    return mountMiniModelScene(modelPreviewRef.current, { gridSize, grid, palette, targetCells, onUnavailable: () => setWebglUnavailable(true) });
  }, [canSeeTargetModel, grid, gridSize, hasChallengeStarted, isFacilitator, isModelSidebarOpen, palette, targetCells, webglUnavailable]);

  useEffect(() => {
    if (!isModelMapOpen || !modelPreviewMobileRef.current || !canSeeTargetModel || webglUnavailable) return () => {};
    return mountMiniModelScene(modelPreviewMobileRef.current, { gridSize, grid, palette, targetCells, onUnavailable: () => setWebglUnavailable(true) });
  }, [canSeeTargetModel, grid, gridSize, isModelMapOpen, palette, targetCells, webglUnavailable]);

  useEffect(() => {
    if (!isModelMapOpen) return () => {};
    function onKeyDown(event) {
      if (event.key === 'Escape') setIsModelMapOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isModelMapOpen]);

  function handleResetBuild() {
    if (!canBuild) return;
    if (!serverCubes.length) return;
    if (!window.confirm(t('challengePixel.removeAllLengthCubesFromThe', { length: serverCubes.length }))) return;
    serverCubes.forEach((cube) => {
      emitEvent('pixel.cube.remove', { x: cube.x, y: cube.y, z: cube.z });
    });
  }

  function handleResetLayer() {
    if (!canBuild) return;
    const cubes = serverCubes.filter((cube) => Number(cube.y) === safeLayer);
    if (!cubes.length) return;
    if (!window.confirm(t('challengePixel.removeLengthCubeSFromShared', { length: cubes.length, safeLayer: safeLayer + 1 }))) return;
    cubes
      .forEach((cube) => {
        emitEvent('pixel.cube.remove', { x: cube.x, y: cube.y, z: cube.z });
      });
  }

  function handleSubmitFinal() {
    if (isFacilitator || !connected) return;
    emitEvent('pixel.submit_final');
  }

  function handleBoardCellToggle(x, z, layer = safeLayer) {
    if (!canBuild) return;
    const normalizedLayer = Math.max(0, Math.min(Number(layer), Math.max(0, grid.y - 1)));
    const key = toCellKey(x, normalizedLayer, z);
    const existingCube = cubesByKey.get(key);
    if (existingCube) {
      emitEvent('pixel.cube.remove', { x, y: normalizedLayer, z });
      return;
    }
    emitEvent('pixel.cube.place', { x, y: normalizedLayer, z, color: selectedColorRef.current });
  }

  function handleToggleLayerClaim(layer) {
    if (isFacilitator || !connected) return;

    const currentClaim = layerClaims[String(layer)] || null;
    const myClaim = Object.values(layerClaims).find(
      (claim) => String(claim?.display_name || '').trim() === String(displayName || '').trim()
    ) || null;
    const isMine = currentClaim && String(currentClaim.display_name || '').trim() === String(displayName || '').trim();

    if (isMine) {
      emitEvent('pixel.layer.release', { layer });
      return;
    }

    // Layer already claimed by someone else — do not override
    if (currentClaim && !isMine) return;

    if (myClaim && Number.isInteger(Number(myClaim.layer)) && Number(myClaim.layer) !== layer) {
      emitEvent('pixel.layer.release', { layer: Number(myClaim.layer) });
    }

    emitEvent('pixel.layer.claim', { layer });
  }

  const summary = state?.summary || null;
  const isDebrief = Boolean(summary) || isLockedByPhase || ['completed', 'timeout'].includes(timerStatus);
  const summaryPixelMetrics = summary?.pixel_metrics || null;
  const templateName = String(selectedTemplate?.name || 'Modèle').trim();
  const templateDifficulty = String(selectedTemplate?.difficulty || state?.config?.difficulty || t('challengePixel.medium')).trim();
  const miniCells = useMemo(() => targetCells.slice(0, 42), [targetCells]);

  const playerExactHits = useMemo(() => {
    if (Number.isFinite(Number(serverEvaluation?.matched_count))) {
      return Number(serverEvaluation.matched_count || 0);
    }
    if (!targetSet.size) return 0;
    return serverCubes.reduce((acc, cube) => {
      const key = toCellKey(cube.x, cube.y, cube.z);
      return acc + (targetSet.has(key) ? 1 : 0);
    }, 0);
  }, [serverCubes, serverEvaluation?.matched_count, targetSet]);

  const missingCount = Number.isFinite(Number(serverEvaluation?.missing_count))
    ? Number(serverEvaluation.missing_count || 0)
    : Math.max(0, targetCubeCount - playerExactHits);

  const extraCount = Number.isFinite(Number(serverEvaluation?.extra_count))
    ? Number(serverEvaluation.extra_count || 0)
    : Math.max(0, cubeCount - playerExactHits);

  const accuracyPercent = Math.max(
    0,
    Math.min(
      100,
      Math.round(Number(serverEvaluation?.accuracy_percent || ((playerExactHits / Math.max(1, targetSet.size)) * 100)))
    )
  );

  const myLayerClaim = useMemo(() => {
    return Object.values(layerClaims).find(
      (claim) => String(claim?.display_name || '').trim() === String(displayName || '').trim()
    ) || null;
  }, [displayName, layerClaims]);

  const layerStats = useMemo(() => {
    return layers.map((layer) => {
      const claim = layerClaims[String(layer)] || null;
      const targetCount = targetCells.filter((cell) => cell.y === layer).length;
      const cubesOnLayer = serverCubes.filter((cube) => cube.y === layer);
      const matchedCount = cubesOnLayer.reduce((count, cube) => {
        const key = toCellKey(cube.x, cube.y, cube.z);
        return count + (targetSet.has(key) ? 1 : 0);
      }, 0);
      const placedCount = cubesOnLayer.length;
      const extraCount = Math.max(0, placedCount - matchedCount);
      const completion = targetCount > 0 ? Math.round((matchedCount / targetCount) * 100) : 0;

      return {
        layer,
        claim,
        targetCount,
        placedCount,
        matchedCount,
        extraCount,
        completion,
      };
    });
  }, [layerClaims, layers, serverCubes, targetCells, targetSet]);

  const contributorStats = useMemo(() => {
    const grouped = serverCubes.reduce((acc, cube) => {
      const key = String(cube.placedBy || 'equipe').trim() || 'equipe';
      if (!acc[key]) {
        acc[key] = { id: key, name: '', cubeCount: 0, layers: new Set(), colors: new Set() };
      }
      // Cubes placed before names were stored only carry the participant id.
      if (!acc[key].name && cube.placedByName) acc[key].name = cube.placedByName;
      acc[key].cubeCount += 1;
      acc[key].layers.add(cube.y);
      acc[key].colors.add(cube.color);
      return acc;
    }, {});

    return Object.values(grouped)
      .map((item) => ({
        id: item.id,
        name: item.name || (item.id === 'equipe' ? t('challengePixel.team') : item.id),
        cubeCount: item.cubeCount,
        layerCount: item.layers.size,
        colorCount: item.colors.size,
      }))
      .sort((a, b) => b.cubeCount - a.cubeCount)
      .slice(0, 6);
  }, [locale, serverCubes]);

  const liveLayerBoards = useMemo(() => {
    return layers.map((layer) => ({
      layer,
      rows: buildLayerBoard(grid, layer, targetSet, cubesByKey),
    }));
  }, [cubesByKey, grid, layers, targetSet]);

  const rulesExtraContent = useMemo(() => (
    <>
      <section className={styles.rulesMetaSection}>
        <h3>{t('challengePixel.executionPlan')}</h3>
        <div className={styles.statusRow}>
          <span className={styles.badge}>{t('challengePixel.phase')}: {phase || 'intro'}</span>
          <span className={styles.badge}>{t('challengePixel.accuracy')}: {accuracyPercent}%</span>
          <span className={styles.badge}>{t('challengePixel.remaining')}: {remainingCubes}</span>
        </div>
        <p className={styles.rulesInlineText}>
          {t('challengePixel.clickGridToPlaceClickA')}
        </p>
        <ul className={styles.howToList}>
          <li>{t('challengePixel.chooseALayerThenPlaceOr')}</li>
          <li>{t('challengePixel.checkTheModelMapAndProgress')}</li>
          <li>{t('challengePixel.coordinateInChatToAvoidDuplicates')}</li>
          <li>{t('challengePixel.submitTheFinalVersionWhenYour')}</li>
        </ul>
        <div className={styles.helperRow}>
          <div className={styles.helperItem}>
            <span className={styles.helperDotTarget} /> {t('challengePixel.targetModelGhost')}
          </div>
          <div className={styles.helperItem}>
            <span className={styles.helperDotPlayer} /> {t('challengePixel.correctCubeOnTarget')}
          </div>
          <div className={styles.helperItem}>
            <span className={styles.helperDotError} /> {t('challengePixel.wrongCubeOrExtraPlacement')}
          </div>
        </div>
      </section>
    </>
  ), [accuracyPercent, phase, remainingCubes, locale]);

  function handleStartChallenge() {
    refreshChallengeStateBeforeStart(emitEvent);
    emitEvent('timer.start');
  }

  return (
    <ChallengePresentation className={styles.container} isDebrief={isDebrief}>
      <ChallengeHeader
        title={challengeName}
        subtitle={challengeSubtitle || t('challengePixel.replicateTheModelTogetherInReal')}
        timer={hasChallengeStarted ? { remainingSeconds: Number(timer?.remaining_seconds || 0) } : null}
        headerAction={hasChallengeStarted ? (
          <ChallengeRulesPanel
            inHeader
            isStarted={hasChallengeStarted}
            isFacilitator={isFacilitator}
            showPrestartCard={false}
            challengeName={challengeName}
            objective={rulesContent.objective}
            participantsMeta={rulesParticipantsMeta}
            facilitatorRules={rulesContent.facilitator}
            participantRules={rulesContent.participant}
            footnote={rulesContent.footnote}
            extraContent={rulesExtraContent}
          />
        ) : null}
      />

      <div className="challenge-mobile-timer">
        <ChallengeTimerCard
          isStarted={hasChallengeStarted}
          title={t('challengePixel.timer')}
          remainingSeconds={Number(timer?.remaining_seconds || 0)}
          durationSeconds={Number(timer?.duration_seconds || runtimePayload?.config?.timer?.duration_seconds || 900)}
          status={String(timer?.status || 'idle')}
          isFacilitator={isFacilitator}
          onPause={timerControls.pause}
          onResume={timerControls.resume}
          controlPending={timerControls.busy}
          controlFeedback={timerControls.feedback}
          waitingText=""
        />
      </div>

      {canSeeTargetModel || (hasChallengeStarted && !isFacilitator) ? (
        <div className={styles.mobileQuickActions}>
          {canSeeTargetModel ? (
            <button
              type="button"
              className={styles.modelMapFab}
              onClick={() => setIsModelMapOpen(true)}
              aria-expanded={isModelMapOpen}
              aria-label={t('challengePixel.openModelMap')}
            >
              {!isDebrief ? '🧩 ' : ''}{t('challengePixel.model')}
            </button>
          ) : null}
          {hasChallengeStarted && !isFacilitator ? (
            <div className={styles.mobilePaletteControl}>
              <button
                type="button"
                className={styles.modelMapFab}
                onClick={() => setIsPaletteOpen((isOpen) => !isOpen)}
                aria-expanded={isPaletteOpen}
                aria-controls="pixel-architect-mobile-palette"
              >
                {t('challengePixel.activePalette')}
              </button>
              {isPaletteOpen ? (
                <div id="pixel-architect-mobile-palette" className={styles.mobilePaletteMenu} role="radiogroup" aria-label={t('challengePixel.colorPalette')}>
                  {palette.map((color) => (
                    <button
                      key={`mobile-swatch-${color}`}
                      type="button"
                      role="radio"
                      aria-checked={selectedColor === color}
                      aria-label={describeColor(color)}
                      title={describeColor(color)}
                      className={`${styles.swatchBtn}${selectedColor === color ? ` ${styles.swatchBtnActive}` : ''}`}
                      style={{ background: color }}
                      onClick={() => {
                        selectColor(color);
                        setIsPaletteOpen(false);
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {isModelMapOpen ? (
        <div className={styles.modelMapSheetBackdrop} onClick={() => setIsModelMapOpen(false)}>
          <div
            className={styles.modelMapSheet}
            ref={modelDialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={t('challengePixel.modelMap')}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modelMapSheetHead}>
              <div>
                <h2>{t('challengePixel.modelMap')}</h2>
                <p>{templateName} · {templateDifficulty} · {grid.x}×{grid.y}×{grid.z} · {targetCubeCount} {t('challengePixel.cubes')}</p>
              </div>
              <button
                type="button"
                className={styles.modelMapSheetClose}
                onClick={() => setIsModelMapOpen(false)}
                aria-label={t('challengePixel.close')}
              >
                ✕
              </button>
            </div>
            <div className={styles.modelSidebarViewport}>
              {webglUnavailable
                ? <p role="status">{t('challengePixel.n3dPreviewUnavailableUseTheTarget')}</p>
                : <><div ref={modelPreviewMobileRef} className={styles.modelMiniCanvas} /><span className={styles.modelMiniHint}>{t('challengePixel.dragToRotate')}</span></>}
            </div>
          </div>
        </div>
      ) : null}

      {webglUnavailable ? (
        <div className={styles.webglFallback}>
          <p>{t('challengePixel.yourBrowserOrDeviceDoesNot')}</p>
          <p>{t('challengePixel.youCanKeepPlayingWithThe')}</p>
        </div>
      ) : null}

      <div className={styles.layout} data-challenge-layout>
        <main className={styles.mainPane}>
          {!hasChallengeStarted ? (
            <ChallengeRulesPanel
              isStarted={false}
              isFacilitator={isFacilitator}
              challengeName={challengeName}
              objective={rulesContent.objective}
              participantsMeta={rulesParticipantsMeta}
              facilitatorRules={rulesContent.facilitator}
              participantRules={rulesContent.participant}
              footnote={rulesContent.footnote}
              extraContent={rulesExtraContent}
              onStart={isFacilitator ? handleStartChallenge : null}
              compactStartButton
            />
          ) : (
            <>
              <section className={styles.panel}>
                <div className={styles.panelHead}>
                  <div className={styles.workspaceCopy}>
                    <h2>{t('challengePixel.layerBuildWorkspace')}</h2>
                    <p>
                      {t('challengePixel.chooseALayerThenClickCells')}
                    </p>
                  </div>
                  {!isFacilitator ? (
                    <div className={styles.paletteRow}>
                      <p className={styles.paletteLabel}>{t('challengePixel.activePalette')}</p>
                      <div className={styles.paletteSwatches} role="radiogroup" aria-label={t('challengePixel.colorPalette')}>
                        {palette.map((color) => (
                          <button
                            key={color}
                            type="button"
                            role="radio"
                            aria-checked={selectedColor === color}
                            aria-label={describeColor(color)}
                            title={describeColor(color)}
                            className={`${styles.swatchBtn}${selectedColor === color ? ` ${styles.swatchBtnActive}` : ''}`}
                            style={{ background: color }}
                            onClick={() => selectColor(color)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className={styles.layerNavigation} role="group" aria-label={t('challengePixel.layerNavigation')}>
                  <label className={styles.activeLayerControl}>
                    <span className={styles.activeLayerLabel}>{t('challengePixel.activeLayer')}</span>
                    <select value={safeLayer} onChange={(event) => setActiveLayer(Number(event.target.value))}>
                      {layers.map((layer) => <option key={layer} value={layer}>{t('challengePixel.layer')} {layer + 1}</option>)}
                    </select>
                    <span className={styles.activeLayerCount} aria-live="polite" aria-atomic="true">
                      {activeLayerIndex + 1} / {layers.length}
                    </span>
                  </label>
                </div>
                <div className={`${styles.layerQuickList}${isFacilitator ? ` ${styles.layerQuickListFacilitator}` : ''}`}>
                  {liveLayerBoards.filter(({ layer }) => !isFacilitator || layer === safeLayer).map(({ layer, rows }) => {
                    const stats = layerStats.find((item) => Number(item.layer) === Number(layer)) || null;
                    const isActive = safeLayer === layer;
                    const claim = layerClaims[String(layer)] || null;
                    const isReservedByMe = Boolean(myLayerClaim && Number(myLayerClaim.layer) === layer);
                    const isReservedByOther = Boolean(claim) && !isReservedByMe;
                    return (
                      <section
                        key={`layer-mini-${layer}`}
                        data-active-layer={isActive}
                        className={`${styles.layerQuickCard}${isActive ? ` ${styles.layerQuickCardActive}` : ''}`}
                        aria-label={`${t('challengePixel.layer')} ${layer + 1}`}
                      >
                        <div className={styles.layerQuickHeadRow}>
                          <button
                            type="button"
                            className={styles.layerQuickActivateBtn}
                            onClick={() => setActiveLayer(layer)}
                            aria-pressed={isActive}
                            aria-label={`${t('challengePixel.activateLayer')} ${layer + 1}`}
                          >
                            {t('challengePixel.layer')} {layer + 1}
                          </button>
                          <button
                            type="button"
                            className={`${styles.layerQuickClaimBtn}${isReservedByMe ? ` ${styles.layerQuickClaimBtnMine}` : ''}${isReservedByOther ? ` ${styles.layerQuickClaimBtnReserved}` : ''}`}
                            onClick={() => handleToggleLayerClaim(layer)}
                            disabled={!connected || isFacilitator || isReservedByOther}
                            title={isReservedByOther ? `${t('challengePixel.reservedBy')} ${String(claim?.display_name || '')}` : undefined}
                          >
                            {isReservedByMe
                              ? t('challengePixel.mine')
                              : isReservedByOther
                                ? t('challengePixel.reserved')
                                : t('challengePixel.open')}
                          </button>
                        </div>
                        <div
                          className={styles.layerQuickGrid}
                          style={{ gridTemplateColumns: `repeat(${grid.x}, minmax(0, 1fr))` }}
                          role="grid"
                          aria-label={`${t('challengePixel.layer')} ${layer + 1}`}
                        >
                          {rows.flatMap((row) => row).map((cell) => {
                            const isPlacedCorrect = cell.isPlaced && cell.isTarget;
                            const isPlacedWrong = cell.isPlaced && !cell.isTarget;
                            const placedColor = String(cell.cube?.color || selectedColor || '#2D9CDB');
                            return (
                              <button
                                key={`mini-${cell.key}`}
                                type="button"
                                className={`${styles.layerQuickCell} ${styles.layerQuickCellBtn}${cell.isTarget ? ` ${styles.layerQuickCellTarget}` : ''}${cell.isPlaced ? ` ${styles.layerQuickCellPlaced}` : ''}${isPlacedCorrect ? ` ${styles.layerQuickCellCorrect}` : ''}${isPlacedWrong ? ` ${styles.layerQuickCellWrong}` : ''}`}
                                style={cell.isPlaced ? { '--pixel-cell-color': placedColor } : undefined}
                                onClick={() => handleBoardCellToggle(cell.x, cell.z, layer)}
                                disabled={!canBuild}
                                aria-label={`${t('challengePixel.layer')} ${layer + 1}, ${t('challengePixel.cell')} x${cell.x + 1} z${cell.z + 1}${cell.isTarget ? `, ${t('challengePixel.target')}` : ''}${cell.isPlaced ? `, ${t('challengePixel.occupied')}` : ''}`}
                              />
                            );
                          })}
                        </div>
                        <div className={styles.layerQuickMetaRow}>
                          <span>{stats ? `${stats.matchedCount}/${stats.targetCount}` : '-'}</span>
                          <span>{stats ? `${stats.completion}%` : '0%'}</span>
                        </div>
                      </section>
                    );
                  })}
                </div>

                {!isFacilitator ? (
                  <div className={`${styles.actionsRow} ${styles.actionsRowSticky}`} aria-label="Actions de construction">
                    <button type="button" className={styles.btnSecondary} onClick={handleResetLayer} disabled={!canBuild || !serverCubes.some((cube) => Number(cube.y) === safeLayer)}>
                      {t('challengePixel.resetLayer')}
                    </button>
                    <button type="button" className={styles.btnSecondary} onClick={handleResetBuild} disabled={!canBuild || serverCubes.length === 0}>
                      {t('challengePixel.resetCubes')}
                    </button>
                    <button type="button" className={styles.btnPrimary} onClick={handleSubmitFinal} disabled={!connected || isLockedByPhase}>
                      {t('challengePixel.submitFinalVersion')}
                    </button>
                  </div>
                ) : (
                  <div className={styles.actionsRow}>
                    <button type="button" className={styles.btnSecondary} onClick={onRequestHint}>
                      {t('challengePixel.broadcastHint')}
                    </button>
                  </div>
                )}

                <div className={styles.attemptCard} role="status" aria-live="polite">
                  <h3>{t('challengePixel.buildProgress')}</h3>
                  <div className={styles.progressCompactGrid}>
                    <p>{t('challengePixel.targets')}: <strong>{targetCubeCount}</strong></p>
                    <p>{t('challengePixel.placed')}: <strong>{cubeCount}</strong></p>
                    <p>{t('challengePixel.exact')}: <strong>{playerExactHits}</strong></p>
                    <p>{t('challengePixel.missing')}: <strong>{missingCount}</strong></p>
                    <p>{t('challengePixel.extra')}: <strong>{extraCount}</strong></p>
                    <p>{t('challengePixel.accuracy2')}: <strong>{accuracyPercent}%</strong></p>
                  </div>
                  <div className={styles.progressTrack} aria-hidden="true">
                    <span className={styles.progressFill} style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </section>

              {summary ? (
                <section className={styles.panel} data-debrief-content>
                  <ChallengeDebriefHeading />
                  <div
                    className={`${styles.summaryGrid}${summaryPixelMetrics ? ` ${styles.summaryGridPixel}` : ''}`}
                    data-debrief-metrics
                    data-pixel-debrief={summaryPixelMetrics ? 'true' : undefined}
                  >
                    <p><span>{t('challengePixel.globalScore')}</span><strong>{Number(summary.collective_score || 0)} / {Number(summary.collective_score_max ?? 100)}</strong></p>
                    <p><span>{t('challengePixel.completion')}</span><strong>{Number(summary.completion_percent || 0)}%</strong></p>
                    <p><span>Actions</span><strong>{Number(summary.action_count || 0)}</strong></p>
                    <p><span>{t('challengePixel.messages')}</span><strong>{Number(summary.message_count || 0)}</strong></p>
                    {summaryPixelMetrics ? <p><span>{t('challengePixel.exact')}</span><strong>{Number(summaryPixelMetrics.matched_count || 0)}</strong></p> : null}
                    {summaryPixelMetrics ? <p><span>{t('challengePixel.missing')}</span><strong>{Number(summaryPixelMetrics.missing_count || 0)}</strong></p> : null}
                    {summaryPixelMetrics ? <p><span>{t('challengePixel.extra')}</span><strong>{Number(summaryPixelMetrics.extra_count || 0)}</strong></p> : null}
                    {summaryPixelMetrics ? <p><span>{t('challengePixel.usedColors')}</span><strong>{Number(summaryPixelMetrics.used_colors || 0)}</strong></p> : null}
                  </div>
                </section>
              ) : null}

            </>
          )}
        </main>

        <aside className={styles.sidebar}>
          <div className="challenge-desktop-timer">
            <ChallengeTimerCard
              isStarted={hasChallengeStarted}
              title={t('challengePixel.timer')}
              remainingSeconds={Number(timer?.remaining_seconds || 0)}
              durationSeconds={Number(timer?.duration_seconds || runtimePayload?.config?.timer?.duration_seconds || 900)}
              status={String(timer?.status || 'idle')}
              isFacilitator={isFacilitator}
              onPause={timerControls.pause}
              onResume={timerControls.resume}
              controlPending={timerControls.busy}
              controlFeedback={timerControls.feedback}
              waitingText=""
            />
          </div>

          <section className={styles.panel}>
            {isFacilitator ? (
              <details
                className={styles.modelDisclosure}
                open={isModelSidebarOpen}
                onToggle={(event) => setIsModelSidebarOpen(event.currentTarget.open)}
              >
                <summary className={styles.disclosureSummary}>
                  <span>
                    <strong>{t('challengePixel.modelMap')}</strong>
                    <small>{templateName} · {templateDifficulty} · {grid.x}×{grid.y}×{grid.z}</small>
                  </span>
                </summary>
                {isModelSidebarOpen ? (
                  <div className={styles.modelSidebarViewport}>
                    {canSeeTargetModel && !webglUnavailable ? (
                      <>
                        <div ref={modelPreviewRef} className={styles.modelMiniCanvas} />
                        <span className={styles.modelMiniHint}>{t('challengePixel.dragToRotate')}</span>
                      </>
                    ) : (
                      <p className={styles.modelMiniHidden}>{webglUnavailable && canSeeTargetModel
                        ? t('challengePixel.n3dPreviewUnavailableUseTheTarget2')
                        : t('challengePixel.modelHiddenForThisRole')}</p>
                    )}
                  </div>
                ) : null}
              </details>
            ) : (
              <>
                <div className={styles.panelHead}>
                  <h2>{t('challengePixel.modelMap')}</h2>
                  <p>{templateName} · {templateDifficulty} · {grid.x}×{grid.y}×{grid.z} · {targetCubeCount} {t('challengePixel.cubes')}</p>
                </div>
                <div className={styles.modelSidebarViewport}>
                  {canSeeTargetModel && !webglUnavailable ? (
                    <>
                      <div ref={modelPreviewRef} className={styles.modelMiniCanvas} />
                      <span className={styles.modelMiniHint}>{t('challengePixel.dragToRotate')}</span>
                    </>
                  ) : (
                    <p className={styles.modelMiniHidden}>{webglUnavailable && canSeeTargetModel
                      ? t('challengePixel.n3dPreviewUnavailableUseTheTarget2')
                      : t('challengePixel.modelHiddenForThisRole')}</p>
                  )}
                </div>
              </>
            )}

            <div className={styles.viewportWrapCompact}>
              <p className={styles.viewportHint}>
                {isFacilitator
                  ? t('challengePixel.n3dObserverViewOfTeamConstruction')
                  : t('challengePixel.n3dTeamBuildViewDragTo')}
              </p>
              <span className={styles.viewportWatermark}>{t('challengePixel.n3dBuildView')}</span>
              {!isViewportReady && !viewportError ? (
                <div className={styles.viewportOverlay} role="status" aria-live="polite">
                  {t('challengePixel.loading3dScene')}
                </div>
              ) : null}
              {viewportError ? (
                <div className={styles.viewportOverlayError} role="alert">
                  {viewportError}
                </div>
              ) : null}
              <div ref={mountRef} className={styles.viewport3dCompact} />
            </div>
          </section>

          {contributorStats.length > 0 ? (
            <details
              className={styles.panel}
              open={!isFacilitator || isContributorStatsOpen}
              onToggle={(event) => setIsContributorStatsOpen(event.currentTarget.open)}
            >
              <summary className={styles.disclosureSummary}>
                <strong>{t('challengePixel.teamDistribution')}</strong>
              </summary>
              <ul className={styles.activityList}>
                {contributorStats.map((item) => (
                  <li key={`contrib-${item.id}`} className={styles.activityItem}>
                    <strong>{item.name}</strong>
                    <span>
                      {item.cubeCount} {item.cubeCount > 1 ? 'cubes' : 'cube'}
                      {' · '}{item.layerCount} {t(item.layerCount > 1 ? 'challengePixel.layersPlural' : 'challengePixel.layerSingular')}
                      {' · '}{item.colorCount} {t(item.colorCount > 1 ? 'challengePixel.colorsPlural' : 'challengePixel.colorSingular')}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {Array.isArray(pixel?.hints) && pixel.hints.length > 0 ? (
            <details
              className={styles.panel}
              open={!isFacilitator || isHintHistoryOpen}
              onToggle={(event) => setIsHintHistoryOpen(event.currentTarget.open)}
            >
              <summary className={styles.disclosureSummary}>
                <strong>{t('challengePixel.hintHistory')}</strong>
              </summary>
              <ul className={styles.attemptList}>
                {pixel.hints.slice(-6).reverse().map((item, index) => (
                  <li key={`hint-${index}`}>
                    {String(item?.text || '')}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {state?.config?.chat?.enabled !== false ? (
            <ChallengeChatCard
              title="Chat"
              messages={chatMessages}
              currentAuthor={displayName}
              inputValue={chatInput}
              onInputChange={setChatInput}
              onSubmit={submitChat}
              delivery={chatDelivery}
              onQuickMessage={sendQuickChat}
              quickMessages={DEFAULT_CHALLENGE_QUICK_MESSAGES}
              disabled={!hasChallengeStarted}
            />
          ) : null}

          {error ? <p className={styles.errorText}>{error}</p> : null}
        </aside>
      </div>
    </ChallengePresentation>
  );
}
