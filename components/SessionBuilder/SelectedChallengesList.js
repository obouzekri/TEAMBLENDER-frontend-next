'use client';

import styles from './SelectedChallengesList.module.css';
import { Button, EmptyState } from '@/components/ui';
import useI18n from '@/lib/i18n/useI18n';
import { useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';

export default function SelectedChallengesList({
  challenges,
  onConfigure,
  onRemove,
  onMoveUp,
  onMoveDown,
  onReorder,
  onClearAll,
}) {
  const { t, locale } = useI18n();
  const listRef = useRef(null);
  const dragRef = useRef(null);
  const [dragState, setDragState] = useState(null);
  const [announcement, setAnnouncement] = useState('');

  function announceMove(challenge, position) {
    setAnnouncement(t('sessionBuilder.activityMoved', {
      name: localizePlainValue(challenge.name),
      position: position + 1,
      count: challenges.length,
    }));
  }

  function finishDrag(event, cancelled = false) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!cancelled && drag.targetId !== drag.sourceId) {
      onReorder(drag.sourceId, drag.targetId);
      announceMove(challenges.find((item) => item.id === drag.sourceId),
        challenges.findIndex((item) => item.id === drag.targetId));
    }
    dragRef.current = null;
    setDragState(null);
  }

  function localizePlainValue(value) {
    if (value == null) return '';
    if (typeof value === 'object' && !Array.isArray(value)) {
      const preferredLocale = locale === 'en' ? 'en' : 'fr';
      return String(value[preferredLocale] || value.fr || value.en || '').trim();
    }
    return String(value || '').trim();
  }

  if (challenges.length === 0) {
    function handleBrowseCatalog() {
      const catalog = document.querySelector('[data-catalog]');
      if (catalog) {
        catalog.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    return (
      <aside className={styles.sidebar}>
        <div className={styles.header}>
          <h2 className={styles.title}>✓ {t('sessionBuilder.selectedActivitiesTitle')}</h2>
          <span className={styles.count}>0</span>
        </div>
        <p className={styles.hint}>
          {t('sessionBuilder.selectedActivitiesHint')}
        </p>
        <EmptyState
          icon="📋"
          title={t('sessionBuilder.selectedActivitiesEmptyTitle')}
          description={t('sessionBuilder.selectedActivitiesEmptyDescription')}
          actions={<Button variant="secondary" size="sm" onClick={handleBrowseCatalog}>{t('sessionBuilder.selectedActivitiesBrowse')}</Button>}
          className={styles.emptyState}
        />
      </aside>
    );
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>✓ {t('sessionBuilder.selectedActivitiesTitle')}</h2>
        <span className={styles.count}>{challenges.length}</span>
      </div>
      <p className={styles.hint}>
        {t('sessionBuilder.selectedActivitiesHint')}
      </p>

      <p className={styles.srOnly} role="status">{announcement}</p>
      <ul className={styles.list} ref={listRef}>
        {challenges.map((challenge, index) => (
          <li
            key={challenge.id}
            data-activity-id={challenge.id}
            className={`${styles.item} ${dragState?.sourceId === challenge.id ? styles.dragging : ''} ${dragState?.targetId === challenge.id ? styles.dropTarget : ''}`}
          >
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.dragHandle}`}
              aria-label={t('sessionBuilder.reorderActivity', { name: localizePlainValue(challenge.name) })}
              title={t('sessionBuilder.reorderHint')}
              onPointerDown={(event) => {
                if (!event.isPrimary || event.button !== 0 || challenges.length < 2) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                event.currentTarget.focus();
                dragRef.current = { pointerId: event.pointerId, sourceId: challenge.id, targetId: challenge.id };
                setDragState(dragRef.current);
              }}
              onPointerMove={(event) => {
                const drag = dragRef.current;
                if (!drag || drag.pointerId !== event.pointerId) return;
                const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-activity-id]');
                const targetId = target && listRef.current?.contains(target)
                  ? challenges.find((item) => String(item.id) === target.dataset.activityId)?.id
                  : drag.sourceId;
                dragRef.current = { ...drag, targetId };
                setDragState(dragRef.current);
                const list = listRef.current;
                const bounds = list?.getBoundingClientRect();
                if (bounds && event.clientY < bounds.top + 32) list.scrollTop -= 12;
                if (bounds && event.clientY > bounds.bottom - 32) list.scrollTop += 12;
              }}
              onPointerUp={(event) => finishDrag(event)}
              onPointerCancel={(event) => finishDrag(event, true)}
              onLostPointerCapture={(event) => finishDrag(event, true)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  dragRef.current = null;
                  setDragState(null);
                }
                if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                  event.preventDefault();
                  const nextIndex = index + (event.key === 'ArrowUp' ? -1 : 1);
                  if (nextIndex < 0 || nextIndex >= challenges.length) return;
                  if (event.key === 'ArrowUp') onMoveUp(challenge.id);
                  else onMoveDown(challenge.id);
                  announceMove(challenge, nextIndex);
                }
              }}
            >
              <GripVertical size={18} aria-hidden="true" />
            </button>
            <div className={styles.itemInfo}>
              <p className={styles.itemTitle}>{localizePlainValue(challenge.name) || t('sessionBuilder.activitySingular')}</p>
            </div>

            <div className={styles.itemActions}>
              <button
                className={`${styles.actionBtn} ${styles.configBtn}`}
                onClick={() => onConfigure(challenge.id)}
                title={t('sessionBuilder.catalogConfigureAction')}
                aria-label={t('sessionBuilder.configureActivityAria')}
              >
                ⚙
              </button>

              <button
                className={`${styles.actionBtn} ${styles.removeBtn}`}
                onClick={() => onRemove(challenge.id)}
                title={t('sessionBuilder.catalogRemoveAction')}
                aria-label={t('sessionBuilder.removeActivityAria')}
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className={styles.footer}>
        <Button className={styles.clearSelectionButton} variant="secondary" size="sm" block onClick={onClearAll}>
          {t('sessionBuilder.clearSelection')}
        </Button>
      </div>
    </aside>
  );
}
