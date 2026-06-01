'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import useChallengeChat from '@/lib/challenges/useChallengeChat';
import { DEFAULT_CHALLENGE_QUICK_MESSAGES } from '@/lib/challenges/chat-presets';
import { resolveChallengeRules } from '@/lib/challenges/rules';
import ChallengeTimerCard from '../ChallengeTimerCard';
import ChallengeChatCard from '../ChallengeChatCard';
import ChallengeRulesPanel from '../ChallengeRulesPanel';
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
    }))
    .filter((cube) => Number.isInteger(cube.x) && Number.isInteger(cube.y) && Number.isInteger(cube.z));
}

export default function PixelArchitectChallenge({ runtimePayload, socket, context, onChallengeCompleted }) {
  const mountRef = useRef(null);
  const audioContextRef = useRef(null);
  const sceneApiRef = useRef(null);
  const canInteractRef = useRef(false);
  const activeLayerRef = useRef(0);

  const [activeLayer, setActiveLayer] = useState(0);
  const [selectedColor, setSelectedColor] = useState(FALLBACK_PALETTE[0]);

  const { state, error, isFacilitator, emitEvent } = useRealtimeChallenge({
    runtimePayload,
    socket,
    context,
    onChallengeCompleted,
  });

  const pixel = state?.pixel || null;
  const timer = state?.timer || null;
  const timerEnabled = timer?.enabled !== false;
  const timerStatus = String(timer?.status || 'idle').trim().toLowerCase();
  const hasChallengeStarted = timer?.enabled === false || ['running', 'paused', 'completed', 'stopped', 'timeout'].includes(timerStatus);
  const phase = String(pixel?.phase || '').trim().toLowerCase();
  const isLockedByPhase = ['debrief', 'fin'].includes(phase);
  const canBuild = !isFacilitator && !isLockedByPhase && (!timerEnabled || timerStatus === 'running');

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
  const layers = useMemo(() => Array.from({ length: grid.y }, (_, index) => index), [grid.y]);
  const safeLayer = Math.max(0, Math.min(activeLayer, Math.max(0, grid.y - 1)));

  const palette = useMemo(() => {
    const fromPixel = Array.isArray(pixel?.palette) ? pixel.palette : [];
    const fromTemplate = Array.isArray(selectedTemplate?.palette) ? selectedTemplate.palette : [];
    const normalized = [...fromPixel, ...fromTemplate]
      .map((item) => String(item || '').trim())
      .filter(Boolean);
    return normalized.length > 0 ? Array.from(new Set(normalized)).slice(0, 6) : [...FALLBACK_PALETTE];
  }, [pixel?.palette, selectedTemplate?.palette]);

  const targetCells = useMemo(() => buildTemplateCells(selectedTemplate), [selectedTemplate]);
  const targetCubeCount = clampInt(selectedTemplate?.target_cube_count, targetCells.length || 24, 1, 400);
  const targetSet = useMemo(
    () => new Set(targetCells.map((cell) => toCellKey(cell.x, cell.y, cell.z))),
    [targetCells]
  );

  const serverCubes = useMemo(() => normalizeServerCubes(pixel?.cubes), [pixel?.cubes]);
  const cubeCount = Number(pixel?.placed_count || serverCubes.length || 0);
  const remainingCubes = Math.max(0, Number(pixel?.remaining_cubes || 0));
  const completionRatio = Math.max(0, Math.min(100, Math.round((cubeCount / Math.max(1, targetCubeCount)) * 100)));
  const progress = completionRatio;

  const viewerRole = String(pixel?.viewer_role || (isFacilitator ? 'facilitator' : 'builder')).trim().toLowerCase();
  const canSeeTargetModel = isFacilitator || viewerRole === 'architect' || pixel?.selected_template;

  const displayName = useMemo(() => {
    const payloadName = String(runtimePayload?.context?.displayName || runtimePayload?.context?.name || '').trim();
    if (payloadName) return payloadName;
    const contextName = String(context?.displayName || context?.name || '').trim();
    if (contextName) return contextName;
    return 'Participant';
  }, [runtimePayload, context]);

  const rulesContent = useMemo(
    () => resolveChallengeRules(state?.config || runtimePayload?.config),
    [runtimePayload?.config, state?.config]
  );

  const { chatInput, setChatInput, chatMessages, submitChat, sendQuickChat } = useChallengeChat({
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
    if (activeLayer > Math.max(0, grid.y - 1)) {
      setActiveLayer(Math.max(0, grid.y - 1));
    }
  }, [activeLayer, grid.y]);

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

    const container = mountRef.current;
    const width = Math.max(320, container.clientWidth || 900);
    const height = Math.max(320, container.clientHeight || 520);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06151f);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 200);
    camera.position.set(gridSize + 2, Math.max(8, grid.y + 2), gridSize + 2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

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

        if (!playerMap.has(key)) {
          const cube = new THREE.Mesh(
            cubeGeometry,
            new THREE.MeshStandardMaterial({
              color: new THREE.Color(item.color || '#22c55e'),
              emissive: '#0f3e24',
              emissiveIntensity: 0.18,
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
      interactionPlane.position.y = Number(layer);
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
      const hit = raycaster.intersectObject(interactionPlane, false)[0] || null;
      const gridCell = hit ? resolveGridCell(hit.point) : null;
      hoverCellRef.value = gridCell;

      if (!gridCell || playerMap.has(gridCell.key) || !canInteractRef.current) {
        previewCube.visible = false;
        return;
      }
      previewCube.visible = true;
      previewCube.position.copy(getCellWorldPosition(gridCell.x, gridCell.y, gridCell.z, gridSize));
    };

    const onPointerDown = (event) => {
      if (!canInteractRef.current) return;

      toLocalPointer(event);
      raycaster.setFromCamera(pointer, camera);
      const allPickables = [...playerGroup.children, interactionPlane];
      const hit = raycaster.intersectObjects(allPickables, false)[0] || null;
      if (!hit) return;

      if (hit.object?.userData?.kind === 'player') {
        const x = Number(hit.object?.userData?.x);
        const y = Number(hit.object?.userData?.y);
        const z = Number(hit.object?.userData?.z);
        if (Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(z)) {
          playTone('remove');
          emitEvent('pixel.cube.remove', { x, y, z });
        }
        return;
      }

      const cell = hoverCellRef.value;
      if (!cell) return;
      if (playerMap.has(cell.key)) return;
      playTone('place');
      emitEvent('pixel.cube.place', { x: cell.x, y: cell.y, z: cell.z, color: selectedColor });
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const onResize = () => {
      const w = Math.max(320, container.clientWidth || 900);
      const h = Math.max(320, container.clientHeight || 520);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', onResize);

    let rafId = 0;
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

      renderer.render(scene, camera);
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

    return () => {
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
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
  }, [emitEvent, grid.x, grid.y, grid.z, gridSize, safeLayer, selectedColor, serverCubes, targetCells]);

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

  function handleResetBuild() {
    if (!canBuild) return;
    serverCubes.forEach((cube) => {
      emitEvent('pixel.cube.remove', { x: cube.x, y: cube.y, z: cube.z });
    });
  }

  function handleSubmitFinal() {
    if (isFacilitator) return;
    emitEvent('pixel.submit_final');
  }

  const summary = state?.summary || null;
  const templateName = String(selectedTemplate?.name || 'Modele').trim();
  const templateDifficulty = String(selectedTemplate?.difficulty || state?.config?.difficulty || 'moyen').trim();
  const miniCells = useMemo(() => targetCells.slice(0, 42), [targetCells]);

  const playerExactHits = useMemo(() => {
    if (!targetSet.size) return 0;
    return serverCubes.reduce((acc, cube) => {
      const key = toCellKey(cube.x, cube.y, cube.z);
      return acc + (targetSet.has(key) ? 1 : 0);
    }, 0);
  }, [serverCubes, targetSet]);

  const accuracyPercent = Math.max(0, Math.min(100, Math.round((playerExactHits / Math.max(1, targetSet.size)) * 100)));

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLine}>
          <h1>Pixel Architect</h1>
          <p>Repliquez le modele collectivement, en temps reel, avec contraintes de grille et palette.</p>
        </div>
        <div className={styles.headerAside}>
          <div className={styles.headerMeta}>
            <span className={styles.badge}>Mode: {String(pixel?.mode || state?.config?.mode || 'replication')}</span>
            <span className={styles.badge}>Role: {viewerRole}</span>
            <span className={styles.badge}>Cubes poses: {cubeCount}</span>
          </div>
          <section className={styles.modelMiniCard}>
            <p className={styles.modelMiniTitle}>Carte modele</p>
            <p className={styles.modelMiniMeta}>{templateName} - {templateDifficulty}</p>
            <div className={styles.modelMiniViewport}>
              {canSeeTargetModel ? (
                miniCells.map((cell, index) => {
                  const left = (cell.x - cell.z) * 8 + 72;
                  const top = (cell.x + cell.z) * 4 - (cell.y * 7) + 34;
                  return (
                    <span
                      key={`mini-${index}-${cell.x}-${cell.y}-${cell.z}`}
                      className={styles.miniVoxel}
                      style={{
                        left: `${left}px`,
                        top: `${top}px`,
                        background: palette[cell.y % Math.max(1, palette.length)] || '#7dd3fc',
                      }}
                    />
                  );
                })
              ) : (
                <p className={styles.modelMiniHidden}>Modele masque pour ce role</p>
              )}
            </div>
            <div className={styles.modelMiniStats}>
              <span>{grid.x}x{grid.y}x{grid.z}</span>
              <span>{targetCubeCount} cubes cibles</span>
            </div>
          </section>
        </div>
      </header>

      <div className={styles.layout}>
        <main className={styles.mainPane}>
          {!hasChallengeStarted ? (
            <ChallengeRulesPanel
              isStarted={false}
              isFacilitator={isFacilitator}
              challengeName="Pixel Architect"
              objective={rulesContent.objective}
              facilitatorRules={rulesContent.facilitator}
              participantRules={rulesContent.participant}
              footnote={rulesContent.footnote}
              onStart={isFacilitator ? () => emitEvent('timer.start') : null}
              compactStartButton
            />
          ) : (
            <>
              <section className={styles.panel}>
                <div className={styles.panelHead}>
                  <h2>Plan d'execution</h2>
                  <p>Le plateau est synchronise entre tous les joueurs. Chaque action est diffusee en direct.</p>
                </div>
                <div className={styles.statusRow}>
                  <span className={styles.badge}>Phase: {phase || 'intro'}</span>
                  <span className={styles.badge}>Exactitude: {accuracyPercent}%</span>
                  <span className={styles.badge}>Restants: {remainingCubes}</span>
                </div>
                <ol className={styles.howToList}>
                  <li>Choisir une couche puis poser/supprimer des cubes.</li>
                  <li>Se coordonner via le chat pour eviter les doublons.</li>
                  <li>Soumettre la version finale quand votre equipe est prete.</li>
                </ol>
                <div className={styles.helperRow}>
                  <div className={styles.helperItem}>
                    <span className={styles.helperDotTarget} /> Modele cible (fantome)
                  </div>
                  <div className={styles.helperItem}>
                    <span className={styles.helperDotPlayer} /> Cubes equipe
                  </div>
                  <div className={styles.helperItem}>
                    <span className={styles.helperDotError} /> Contraintes depassees
                  </div>
                </div>
              </section>

              <section className={styles.panel}>
                <div className={styles.panelHead}>
                  <h2>Zone de construction 3D</h2>
                  <p>Cliquer la grille pour poser, cliquer un cube pour supprimer, glisser pour orbiter/zoomer.</p>
                </div>

                <div className={styles.layerTabs}>
                  {layers.map((layer) => (
                    <button
                      key={`layer-${layer}`}
                      type="button"
                      className={`${styles.layerBtn}${safeLayer === layer ? ` ${styles.layerBtnActive}` : ''}`}
                      onClick={() => setActiveLayer(layer)}
                    >
                      Couche {layer + 1}
                    </button>
                  ))}
                </div>

                <div className={styles.paletteRow}>
                  <p className={styles.paletteLabel}>Palette active</p>
                  <div className={styles.paletteSwatches}>
                    {palette.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`Couleur ${color}`}
                        className={`${styles.swatchBtn}${selectedColor === color ? ` ${styles.swatchBtnActive}` : ''}`}
                        style={{ background: color }}
                        onClick={() => setSelectedColor(color)}
                        disabled={isFacilitator}
                      />
                    ))}
                  </div>
                </div>

                <div className={styles.viewportWrap}>
                  <div ref={mountRef} className={styles.viewport3d} />
                </div>

                {!isFacilitator ? (
                  <div className={styles.actionsRow}>
                    <button type="button" className={styles.btnSecondary} onClick={handleResetBuild} disabled={!canBuild}>
                      Reinitialiser les cubes
                    </button>
                    <button type="button" className={styles.btnPrimary} onClick={handleSubmitFinal} disabled={isLockedByPhase}>
                      Soumettre version finale
                    </button>
                  </div>
                ) : (
                  <div className={styles.actionsRow}>
                    <button type="button" className={styles.btnSecondary} onClick={onRequestHint}>
                      Diffuser un indice
                    </button>
                  </div>
                )}

                <div className={styles.attemptCard}>
                  <h3>Etat live du build</h3>
                  <p>Cubes cibles: <strong>{targetCubeCount}</strong></p>
                  <p>Cubes poses equipe: <strong>{cubeCount}</strong></p>
                  <p>Precision instantanee: <strong>{accuracyPercent}%</strong></p>
                </div>
              </section>

              {summary ? (
                <section className={styles.panel}>
                  <h2>Debrief</h2>
                  <div className={styles.summaryGrid}>
                    <p>Score global: <strong>{Number(summary.collective_score || 0)}</strong></p>
                    <p>Completion: <strong>{Number(summary.completion_percent || 0)}%</strong></p>
                    <p>Actions: <strong>{Number(summary.action_count || 0)}</strong></p>
                    <p>Messages: <strong>{Number(summary.message_count || 0)}</strong></p>
                  </div>
                </section>
              ) : null}
            </>
          )}
        </main>

        <aside className={styles.sidebar}>
          <ChallengeTimerCard
            title="CHRONO"
            remainingSeconds={Number(timer?.remaining_seconds || 0)}
            durationSeconds={Number(timer?.duration_seconds || runtimePayload?.config?.timer?.duration_seconds || 900)}
            status={String(timer?.status || 'idle')}
            progressPercent={progress}
            isFacilitator={isFacilitator}
            collapsible={false}
          />

          <section className={styles.panel}>
            <h3>Etat equipe</h3>
            <p>Template: {templateName}</p>
            <p>Difficulte: {templateDifficulty}</p>
            <p>Cubes cibles: {targetCubeCount}</p>
            <p>Cubes poses: {cubeCount}</p>
            <p>Progression: {progress}%</p>
            <p>Indices utilises: {Number(pixel?.hints_used || 0)}</p>
          </section>

          {Array.isArray(pixel?.hints) && pixel.hints.length > 0 ? (
            <section className={styles.panel}>
              <h3>Historique indices</h3>
              <ul className={styles.attemptList}>
                {pixel.hints.slice(-6).reverse().map((item, index) => (
                  <li key={`hint-${index}`}>
                    {String(item?.text || '')}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {state?.config?.chat?.enabled !== false ? (
            <ChallengeChatCard
              title="Chat"
              messages={chatMessages}
              currentAuthor={displayName}
              inputValue={chatInput}
              onInputChange={setChatInput}
              onSubmit={submitChat}
              onQuickMessage={sendQuickChat}
              quickMessages={DEFAULT_CHALLENGE_QUICK_MESSAGES}
              disabled={!hasChallengeStarted}
              placeholder="Coordonnez vos actions"
            />
          ) : null}

          {error ? <p className={styles.errorText}>{error}</p> : null}
        </aside>
      </div>
    </div>
  );
}
