'use client';

import { useRef, useState } from 'react';
import styles from './EscapeRoomPuzzles.module.css';

const edgeKey = (a, b) => [a, b].sort().join(':');

export function OneStrokePuzzle({ data, disabled, isEn, onAnswerChange }) {
  const [path, setPath] = useState([]);
  const [message, setMessage] = useState('');
  const gesture = useRef(null);
  const pathRef = useRef([]);
  const nodes = data.nodes || [];
  const edges = data.edges || [];
  const usedEdges = new Set(path.slice(1).map((node, i) => edgeKey(path[i], node)));
  const complete = usedEdges.size === edges.length && edges.length > 0;

  function reset() {
    gesture.current = null;
    pathRef.current = [];
    setPath([]);
    setMessage('');
    onAnswerChange('');
  }

  function visit(id) {
    const current = pathRef.current;
    if (current[current.length - 1] === id) return;
    if (current.length > 0) {
      const key = edgeKey(current[current.length - 1], id);
      if (!edges.some(([a, b]) => edgeKey(a, b) === key)) {
        setMessage(isEn ? 'These corners are not connected by an edge.' : 'Ces sommets ne sont pas reliés par un trait.');
        return;
      }
      if (current.slice(1).some((node, i) => edgeKey(current[i], node) === key)) {
        setMessage(isEn ? 'You have already drawn this edge. Try another route.' : 'Ce trait est déjà tracé. Essayez un autre chemin.');
        return;
      }
    }
    const next = [...current, id];
    pathRef.current = next;
    setPath(next);
    setMessage('');
    onAnswerChange(next.length === edges.length + 1 ? next.join(',') : '');
  }

  function nearestNode(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) * 300 / rect.width;
    const y = (event.clientY - rect.top) * 300 / rect.height;
    return nodes.find((node) => Math.hypot(node.x - x, node.y - y) <= 24);
  }

  function stopGesture(event) {
    if (gesture.current?.pointerId !== event.pointerId) return;
    gesture.current = null;
    if (pathRef.current.length !== edges.length + 1) {
      setMessage(isEn ? 'Stroke interrupted. Restart to draw without lifting.' : 'Trait interrompu. Recommencez pour tracer sans lever le doigt.');
      onAnswerChange('');
    }
  }

  return (
    <div className={styles.puzzle}>
      <p className={styles.instructions} id="stroke-instructions">
        {isEn
          ? 'Drag from corner to corner in one stroke. With a keyboard, activate each corner in order. The crossing is not a stopping point.'
          : 'Glissez de sommet en sommet en un seul trait. Au clavier, activez les sommets dans l’ordre. Le croisement n’est pas un point d’arrêt.'}
      </p>
      <div
        className={`${styles.houseBoard}${disabled ? ` ${styles.boardDisabled}` : ''}`}
        aria-describedby="stroke-instructions"
        onPointerDown={(event) => {
          if (disabled || event.button !== 0 || gesture.current) return;
          const node = nearestNode(event);
          if (!node) return;
          if (pathRef.current.length > 0) {
            setMessage(isEn ? 'Restart before beginning a new stroke.' : 'Recommencez avant de débuter un nouveau trait.');
            return;
          }
          event.currentTarget.setPointerCapture(event.pointerId);
          gesture.current = { pointerId: event.pointerId };
          visit(node.id);
        }}
        onPointerMove={(event) => {
          if (disabled || gesture.current?.pointerId !== event.pointerId) return;
          const node = nearestNode(event);
          if (node) visit(node.id);
        }}
        onPointerUp={stopGesture}
        onPointerCancel={stopGesture}
        onLostPointerCapture={stopGesture}
      >
        <svg viewBox="0 0 300 300" className={styles.houseSvg} aria-hidden="true">
          {edges.map(([a, b]) => {
            const start = nodes.find((node) => node.id === a);
            const end = nodes.find((node) => node.id === b);
            return start && end ? (
              <line key={edgeKey(a, b)} x1={start.x} y1={start.y} x2={end.x} y2={end.y}
                className={usedEdges.has(edgeKey(a, b)) ? styles.drawnEdge : styles.houseEdge} />
            ) : null;
          })}
        </svg>
        {nodes.map((node) => (
          <button
            key={node.id}
            type="button"
            className={`${styles.houseNode}${path[path.length - 1] === node.id ? ` ${styles.currentNode}` : ''}`}
            style={{ left: `${node.x / 3}%`, top: `${node.y / 3}%` }}
            disabled={disabled || complete}
            aria-label={`${isEn ? 'Corner' : 'Sommet'} ${node.id.toUpperCase()}`}
            onClick={(event) => {
              if (event.detail === 0 && !disabled && !complete) visit(node.id);
            }}
          >{node.id.toUpperCase()}</button>
        ))}
      </div>
      <p className={styles.status} role="status">
        {message || (complete
          ? (isEn ? 'House complete. You can submit your drawing.' : 'Maison terminée. Vous pouvez soumettre votre dessin.')
          : `${usedEdges.size}/${edges.length} ${isEn ? 'edges drawn' : 'traits tracés'}`)}
      </p>
      <button className={styles.secondaryButton} type="button" onClick={reset} disabled={disabled}>
        {isEn ? 'Restart drawing' : 'Recommencer le dessin'}
      </button>
    </div>
  );
}

const SYMBOLS = [
  { id: 'add', value: '+', label: '+' },
  { id: 'subtract', value: '-', label: '−' },
  { id: 'multiply', value: '*', label: '×' },
  { id: 'divide', value: '/', label: '÷' },
  { id: 'open', value: '(', label: '(' },
  { id: 'close', value: ')', label: ')' }
];

export function ArithmeticPuzzle({ data, disabled, isEn, onAnswerChange }) {
  const tokens = [
    ...(data.numbers || []).map((number, i) => ({ id: `number-${i}`, value: String(number), label: String(number), number: true })),
    ...SYMBOLS
  ];
  const [slots, setSlots] = useState(() => Array(data.slot_count).fill(null));
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const dragged = useRef(null);
  const tokenById = (id) => tokens.find((token) => token.id === id);

  function update(next) {
    setSlots(next);
    setMessage('');
    onAnswerChange(next.every(Boolean) ? next.map((id) => tokenById(id).value).join('') : '');
  }

  function place(index, selection) {
    if (disabled || !selection || !tokenById(selection.id)) return;
    const next = [...slots];
    if (selection.from != null) {
      next[selection.from] = next[index];
    } else if (tokenById(selection.id).number) {
      const previous = next.indexOf(selection.id);
      if (previous !== -1) next[previous] = null;
    }
    next[index] = selection.id;
    update(next);
    setSelected(null);
  }

  function beginDrag(event, selection) {
    if (disabled) {
      event.preventDefault();
      return;
    }
    dragged.current = selection;
    event.dataTransfer.setData('application/x-escape-token', JSON.stringify(selection));
    event.dataTransfer.effectAllowed = 'move';
  }

  const filled = slots.filter(Boolean).length;
  return (
    <div className={styles.puzzle}>
      <p className={styles.instructions} id="arithmetic-instructions">
        {isEn
          ? 'Drag tiles into the 11 slots, or select a tile and then a slot. Click a filled slot without a selection to clear it. Operators and parentheses can be reused.'
          : 'Glissez les tuiles dans les 11 cases, ou sélectionnez une tuile puis une case. Cliquez sur une case remplie sans sélection pour la vider. Les signes et parenthèses sont réutilisables.'}
      </p>
      <div className={styles.tokenTray} role="group" aria-label={isEn ? 'Available tiles' : 'Tuiles disponibles'}>
        {tokens.map((token, index) => (
          <button
            type="button" key={token.id} className={styles.token}
            aria-label={token.number ? `${isEn ? 'Number' : 'Chiffre'} ${token.label} (${index + 1})` : `${isEn ? 'Symbol' : 'Signe'} ${token.label}`}
            aria-pressed={selected?.id === token.id}
            disabled={disabled || (token.number && slots.includes(token.id))}
            draggable={!disabled && !(token.number && slots.includes(token.id))}
            onDragStart={(event) => beginDrag(event, { id: token.id })}
            onDragEnd={() => { dragged.current = null; }}
            onClick={() => setSelected(selected?.id === token.id ? null : { id: token.id })}
          >{token.label}</button>
        ))}
      </div>
      <div className={styles.expression} role="group" aria-label={isEn ? '11 expression slots' : '11 cases du calcul'} aria-describedby="arithmetic-instructions">
        {slots.map((id, index) => (
          <button
            type="button" key={index} className={styles.slot}
            aria-label={`${isEn ? 'Slot' : 'Case'} ${index + 1}${id ? ` : ${tokenById(id).label}` : ''}`}
            disabled={disabled}
            draggable={!disabled && Boolean(id)}
            onDragStart={(event) => beginDrag(event, { id, from: index })}
            onDragEnd={() => { dragged.current = null; }}
            onDragOver={(event) => { if (!disabled) event.preventDefault(); }}
            onDrop={(event) => {
              event.preventDefault();
              if (!disabled && dragged.current) place(index, dragged.current);
              dragged.current = null;
            }}
            onClick={() => {
              if (selected) place(index, selected);
              else if (id) {
                const next = [...slots];
                next[index] = null;
                update(next);
              } else setMessage(isEn ? 'Select a tile first.' : 'Sélectionnez d’abord une tuile.');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Delete' || event.key === 'Backspace') {
                event.preventDefault();
                const next = [...slots];
                next[index] = null;
                update(next);
              }
            }}
          >{id ? tokenById(id).label : <span aria-hidden="true">{index + 1}</span>}</button>
        ))}
      </div>
      <p className={styles.target}>= {data.target}</p>
      <p role="status" className={styles.status}>
        {message || `${filled}/${slots.length} ${isEn ? 'slots filled' : 'cases remplies'}`}
        {selected ? ` · ${isEn ? 'Selected tile' : 'Tuile sélectionnée'} : ${tokenById(selected.id).label}` : ''}
      </p>
      <button className={styles.secondaryButton} type="button" disabled={disabled} onClick={() => {
        update(Array(data.slot_count).fill(null));
        setSelected(null);
      }}>{isEn ? 'Clear expression' : 'Effacer le calcul'}</button>
    </div>
  );
}

export function LetterSequencePuzzle({ data }) {
  return (
    <div className={styles.letterSequence} aria-label="D S V J M ? L">
      {(data.sequence || []).map((letter, index) => (
        <span key={index} className={letter === '?' ? styles.missingLetter : styles.letter}>{letter}</span>
      ))}
    </div>
  );
}
