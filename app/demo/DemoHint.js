'use client';

import { Lightbulb } from 'lucide-react';
import styles from './Demo.module.css';

// Coach mark anchored to the action the visitor should take next: the target pulses and a
// bubble next to it explains why. It never blocks the target, so one click moves the demo on.
export default function DemoHint({ show, text, dismissLabel, onDismiss, align = 'end', placement = 'bottom', children }) {
  if (!show) return children;
  return (
    <span className={styles.hintAnchor} data-align={align} data-placement={placement}>
      {children}
      <span className={styles.hintBubble} role="status">
        <Lightbulb size={16} aria-hidden="true" className={styles.hintIcon} />
        <span>{text}</span>
        <button type="button" className={styles.hintDismiss} onClick={onDismiss}>
          {dismissLabel}
        </button>
      </span>
    </span>
  );
}
