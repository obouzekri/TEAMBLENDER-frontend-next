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

const MAX_ATTEMPTS = 3;
const PLAYER_GREEN = '#22c55e';
const EXTRA_RED = '#ef4444';

const LEVELS = Object.freeze([
  {
    id: 'level_easy',
    name: 'Level 1 - Easy',
    label: 'Cross + top cube',
    gridSize: 5,
    targetCells: [
      [2, 0, 2],
      [1, 0, 2],
      [3, 0, 2],
      [2, 0, 1],
      [2, 0, 3],
      [2, 1, 2],
    ],
  },
  {
    id: 'level_medium',
    name: 'Level 2 - Medium',
    label: 'Staircase',
    gridSize: 5,
    targetCells: [
      [0, 0, 2], [1, 0, 2], [2, 0, 2], [3, 0, 2], [4, 0, 2],
      [1, 1, 2], [2, 1, 2], [3, 1, 2], [4, 1, 2],
      [2, 2, 2], [3, 2, 2], [4, 2, 2],
      [3, 3, 2], [4, 3, 2],
      [4, 4, 2],
    ],
  },
  {
    id: 'level_hard',
    name: 'Level 3 - Hard',
    label: 'Small house',
    gridSize: 6,
    targetCells: [
      [1, 0, 1], [2, 0, 1], [3, 0, 1], [4, 0, 1],
      [1, 0, 2], [2, 0, 2], [3, 0, 2], [4, 0, 2],
      [1, 0, 3], [2, 0, 3], [3, 0, 3], [4, 0, 3],
      [1, 0, 4], [2, 0, 4], [3, 0, 4], [4, 0, 4],
      [1, 1, 1], [4, 1, 1], [1, 1, 4], [4, 1, 4],
      [1, 2, 1], [4, 2, 1], [1, 2, 4], [4, 2, 4],
      [2, 2, 1], [3, 2, 1], [2, 2, 4], [3, 2, 4],
      [2, 3, 2], [3, 3, 2], [2, 3, 3], [3, 3, 3],
    ],
  },
]);

function toCellKey(x, y, z) {
  return `${x}:${y}:${z}`;
}

function fromCellKey(key) {
  const [x, y, z] = String(key).split(':').map((v) => Number.parseInt(v, 10));
  return {
    x: Number.isInteger(x) ? x : 0,
    y: Number.isInteger(y) ? y : 0,
    z: Number.isInteger(z) ? z : 0,
  };
}

function getCellWorldPosition(x, y, z, gridSize) {
  const offset = (gridSize - 1) / 2;
  return new THREE.Vector3(x - offset, y + 0.5, z - offset);
}

export default function PixelArchitectChallenge({ runtimePayload, socket, context, onChallengeCompleted }) {
  const mountRef = useRef(null);
  const audioContextRef = useRef(null);
  const sceneApiRef = useRef(null);
  const canInteractRef = useRef(false);
  const activeLayerRef = useRef(0);

  const [selectedLevelId, setSelectedLevelId] = useState(LEVELS[0].id);
  const [activeLayer, setActiveLayer] = useState(0);
  const [playerCubeCount, setPlayerCubeCount] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState(MAX_ATTEMPTS);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [attemptHistory, setAttemptHistory] = useState([]);

  const { state, error, isFacilitator, emitEvent } = useRealtimeChallenge({
    runtimePayload,
    socket,
    context,
    onChallengeCompleted,
  });

  const timer = state?.timer || null;
  const timerStatus = String(timer?.status || 'idle').trim().toLowerCase();
  const hasChallengeStarted = timer?.enabled === false || ['running', 'paused', 'completed', 'stopped', 'timeout'].includes(timerStatus);
  const canBuild = !isFacilitator && !isGameOver && (timer?.enabled === false || timerStatus === 'running');

  const selectedLevel = useMemo(
    () => LEVELS.find((level) => level.id === selectedLevelId) || LEVELS[0],
    [selectedLevelId]
  );
  const gridSize = Number(selectedLevel.gridSize || 5);
  const layers = useMemo(() => Array.from({ length: gridSize }, (_, index) => index), [gridSize]);
  const targetSet = useMemo(
    () => new Set(selectedLevel.targetCells.map(([x, y, z]) => toCellKey(x, y, z))),
    [selectedLevel]
  );
  const targetCubeCount = targetSet.size;
  const safeLayer = Math.max(0, Math.min(activeLayer, Math.max(0, gridSize - 1)));
  const progress = Math.max(0, Math.min(100, Math.round((playerCubeCount / Math.max(1, targetCubeCount)) * 100)));

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
    camera.position.set(gridSize + 2, gridSize + 2, gridSize + 2);

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

    const boundsGeometry = new THREE.BoxGeometry(gridSize, gridSize, gridSize);
    const boundsEdges = new THREE.EdgesGeometry(boundsGeometry);
    const bounds = new THREE.LineSegments(
      boundsEdges,
      new THREE.LineBasicMaterial({ color: 0x7fa6c2, transparent: true, opacity: 0.26 })
    );
    bounds.position.set(0, gridSize / 2, 0);
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

    const targetMaterial = new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.35,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.34,
      metalness: 0.1,
      roughness: 0.35,
    });

    selectedLevel.targetCells.forEach(([x, y, z]) => {
      const cube = new THREE.Mesh(cubeGeometry, targetMaterial.clone());
      cube.position.copy(getCellWorldPosition(x, y, z, gridSize));
      cube.userData.cellKey = toCellKey(x, y, z);
      cube.userData.kind = 'target';
      targetGroup.add(cube);
    });

    const previewCube = new THREE.Mesh(
      cubeGeometry,
      new THREE.MeshStandardMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0.28,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.22,
      })
    );
    previewCube.visible = false;
    scene.add(previewCube);

    const playerMap = new Map();
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

    const syncCount = () => {
      setPlayerCubeCount(playerMap.size);
    };

    const addPlayerCube = (x, y, z) => {
      const key = toCellKey(x, y, z);
      if (playerMap.has(key)) return;
      const cube = new THREE.Mesh(
        cubeGeometry,
        new THREE.MeshStandardMaterial({
          color: PLAYER_GREEN,
          emissive: '#14532d',
          emissiveIntensity: 0.2,
          roughness: 0.42,
          metalness: 0.08,
        })
      );
      cube.position.copy(getCellWorldPosition(x, y, z, gridSize));
      cube.scale.set(0.1, 0.1, 0.1);
      cube.userData.cellKey = key;
      cube.userData.kind = 'player';
      cube.userData.spawnAt = performance.now();
      playerGroup.add(cube);
      playerMap.set(key, cube);
      syncCount();
      playTone('place');
      emitEvent('pixel.cube.place', { x, y, z, color: PLAYER_GREEN });
    };

    const removePlayerCube = (key) => {
      const cube = playerMap.get(key);
      if (!cube) return;
      const { x, y, z } = fromCellKey(key);
      playerGroup.remove(cube);
      if (cube.material) cube.material.dispose();
      playerMap.delete(key);
      syncCount();
      playTone('remove');
      emitEvent('pixel.cube.remove', { x, y, z });
    };

    const resetBuild = () => {
      playerMap.forEach((cube) => {
        playerGroup.remove(cube);
        if (cube.material) cube.material.dispose();
      });
      playerMap.clear();
      syncCount();
    };

    const flashExtra = (extraKeys) => {
      extraKeys.forEach((key) => {
        const cube = playerMap.get(key);
        if (!cube || !cube.material) return;
        const original = cube.material.color.getHex();
        cube.material.color.set(EXTRA_RED);
        cube.material.emissive.set('#7f1d1d');
        setTimeout(() => {
          if (!cube.material) return;
          cube.material.color.setHex(original);
          cube.material.emissive.set('#14532d');
        }, 650);
      });
    };

    const markCorrect = (correctKeys) => {
      correctKeys.forEach((key) => {
        const cube = playerMap.get(key);
        if (!cube || !cube.material) return;
        cube.material.color.set('#22c55e');
        cube.material.emissive.set('#16a34a');
        cube.material.emissiveIntensity = 0.32;
      });
    };

    const setLayer = (layer) => {
      interactionPlane.position.y = Number(layer);
    };

    const getPlayerKeys = () => Array.from(playerMap.keys());

    const toLocalPointer = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const isInside = (x, y, z) => x >= 0 && x < gridSize && y >= 0 && y < gridSize && z >= 0 && z < gridSize;

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
        const key = String(hit.object.userData.cellKey || '');
        if (key) removePlayerCube(key);
        return;
      }

      const cell = hoverCellRef.value;
      if (!cell) return;
      if (playerMap.has(cell.key)) return;
      addPlayerCube(cell.x, cell.y, cell.z);
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
      addPlayerCube,
      removePlayerCube,
      resetBuild,
      getPlayerKeys,
      flashExtra,
      markCorrect,
      setLayer,
    };

    return () => {
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.cancelAnimationFrame(rafId);

      playerMap.forEach((cube) => {
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
  }, [emitEvent, gridSize, safeLayer, selectedLevel]);

  function resetGameState() {
    sceneApiRef.current?.resetBuild?.();
    setPlayerCubeCount(0);
    setAttemptsRemaining(MAX_ATTEMPTS);
    setAttemptsUsed(0);
    setAttemptHistory([]);
    setLastResult(null);
    setIsGameOver(false);
    setIsSuccess(false);
  }

  function handleResetBuild() {
    if (isFacilitator) return;
    sceneApiRef.current?.resetBuild?.();
    setPlayerCubeCount(0);
  }

  function handleSelectLevel(levelId) {
    setSelectedLevelId(levelId);
    setActiveLayer(0);
    resetGameState();
  }

  function handleSubmitAttempt() {
    if (isFacilitator || isGameOver) return;

    const playerKeys = sceneApiRef.current?.getPlayerKeys?.() || [];
    const playerSet = new Set(playerKeys);

    const correctKeys = playerKeys.filter((key) => targetSet.has(key));
    const extraKeys = playerKeys.filter((key) => !targetSet.has(key));
    const missingKeys = Array.from(targetSet).filter((key) => !playerSet.has(key));
    const solved = extraKeys.length === 0 && missingKeys.length === 0 && targetSet.size > 0;

    sceneApiRef.current?.markCorrect?.(correctKeys);
    sceneApiRef.current?.flashExtra?.(extraKeys);

    const nextAttemptsUsed = attemptsUsed + 1;
    const nextAttemptsRemaining = Math.max(0, MAX_ATTEMPTS - nextAttemptsUsed);
    const accuracy = Math.round((correctKeys.length / Math.max(1, targetSet.size)) * 100);

    const result = {
      attempt: nextAttemptsUsed,
      correct: correctKeys.length,
      extra: extraKeys.length,
      missing: missingKeys.length,
      accuracy,
    };

    setAttemptsUsed(nextAttemptsUsed);
    setAttemptsRemaining(nextAttemptsRemaining);
    setLastResult(result);
    setAttemptHistory((prev) => [result, ...prev].slice(0, MAX_ATTEMPTS));

    emitEvent('pixel.submit_attempt', {
      attempt: nextAttemptsUsed,
      correct: correctKeys.length,
      extra: extraKeys.length,
      missing: missingKeys.length,
      accuracy,
      level: selectedLevel.id,
    });

    if (solved || nextAttemptsRemaining <= 0) {
      setIsGameOver(true);
      setIsSuccess(solved);
      emitEvent('pixel.submit_final');
    }
  }

  const summary = state?.summary || null;
  const latestAccuracy = Number(lastResult?.accuracy || 0);
  const levelLabel = `${selectedLevel.name} (${selectedLevel.label})`;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLine}>
          <h1>Pixel Architect</h1>
          <p>Rebuild the model using cubes</p>
        </div>
        <div className={styles.headerMeta}>
          <span className={styles.badge}>Level: {levelLabel}</span>
          <span className={styles.badge}>Attempts: {attemptsRemaining}</span>
          <span className={styles.badge}>Cubes: {playerCubeCount}</span>
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
                  <h2>Target Model</h2>
                  <p>Ghost cubes are always visible in blue. Build your own structure in green.</p>
                </div>
                <div className={styles.levelRow}>
                  {LEVELS.map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      className={`${styles.levelBtn}${selectedLevel.id === level.id ? ` ${styles.levelBtnActive}` : ''}`}
                      onClick={() => handleSelectLevel(level.id)}
                      disabled={isFacilitator}
                    >
                      {level.name}
                    </button>
                  ))}
                </div>
                <div className={styles.helperRow}>
                  <div className={styles.helperItem}>
                    <span className={styles.helperDotTarget} /> Target (ghost)
                  </div>
                  <div className={styles.helperItem}>
                    <span className={styles.helperDotPlayer} /> Player cubes
                  </div>
                  <div className={styles.helperItem}>
                    <span className={styles.helperDotError} /> Extra cubes on submit
                  </div>
                </div>
              </section>

              <section className={styles.panel}>
                <div className={styles.panelHead}>
                  <h2>3D Build Area</h2>
                  <p>Click grid to place, click existing cube to remove, drag to orbit and zoom.</p>
                </div>

                <div className={styles.layerTabs}>
                  {layers.map((layer) => (
                    <button
                      key={`layer-${layer}`}
                      type="button"
                      className={`${styles.layerBtn}${safeLayer === layer ? ` ${styles.layerBtnActive}` : ''}`}
                      onClick={() => setActiveLayer(layer)}
                    >
                      Layer {layer + 1}
                    </button>
                  ))}
                </div>

                <div className={styles.viewportWrap}>
                  <div ref={mountRef} className={styles.viewport3d} />
                </div>

                {!isFacilitator ? (
                  <div className={styles.actionsRow}>
                    <button type="button" className={styles.btnSecondary} onClick={handleResetBuild} disabled={!canBuild}>
                      Reset build
                    </button>
                    <button type="button" className={styles.btnPrimary} onClick={handleSubmitAttempt} disabled={!canBuild}>
                      Submit Attempt
                    </button>
                  </div>
                ) : (
                  <div className={styles.actionsRow}>
                    <button type="button" className={styles.btnSecondary} onClick={onRequestHint}>
                      Diffuser un indice
                    </button>
                  </div>
                )}

                {lastResult ? (
                  <div className={styles.attemptCard}>
                    <h3>Attempt {lastResult.attempt} result</h3>
                    <p>Correct cubes: <strong>{lastResult.correct}</strong></p>
                    <p>Missing cubes: <strong>{lastResult.missing}</strong></p>
                    <p>Extra cubes: <strong>{lastResult.extra}</strong></p>
                  </div>
                ) : null}

                {isGameOver ? (
                  <div className={styles.finalCard}>
                    <h3>{isSuccess ? 'Success' : 'Failed'}</h3>
                    <p>Accuracy: <strong>{latestAccuracy}%</strong></p>
                    <p>Attempts: <strong>{attemptsUsed} / {MAX_ATTEMPTS}</strong></p>
                    <button type="button" className={styles.btnSecondary} onClick={resetGameState}>
                      Try again
                    </button>
                  </div>
                ) : null}
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
            <p>Level: {selectedLevel.name}</p>
            <p>Target cubes: {targetCubeCount}</p>
            <p>Your cubes: {playerCubeCount}</p>
            <p>Attempts remaining: {attemptsRemaining}</p>
            <p>Progress vs target: {progress}%</p>
          </section>

          {attemptHistory.length > 0 ? (
            <section className={styles.panel}>
              <h3>Attempt log</h3>
              <ul className={styles.attemptList}>
                {attemptHistory.map((item) => (
                  <li key={`attempt-${item.attempt}`}>
                    #{item.attempt} - ok {item.correct}, missing {item.missing}, extra {item.extra}
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
