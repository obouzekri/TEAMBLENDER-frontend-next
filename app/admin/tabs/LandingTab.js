"use client";

import { LANDING_ALLOWED_BLOCK_KEYS } from '@/lib/admin/constants';

// Onglet « landing » de la console admin : rendu seul, l'état et les actions restent dans AdminClient.
export default function LandingTab({
  beginEditLandingBlock,
  busyDeleteKey,
  busySaveKey,
  editingLandingBlock,
  filteredLandingBlocks,
  handleDeleteLandingBlock,
  landingBlocks,
  landingQuery,
  newLandingBlock,
  newLandingMessage,
  setEditingLandingBlock,
  setLandingQuery,
  setNewLandingBlock,
  setNewLandingMessage,
  setShowNewLandingBlockForm,
  showNewLandingBlockForm,
  submitEditLandingBlock,
  submitNewLandingBlock,
  t,
}) {
  return (
    <div>
      <datalist id="landing-allowed-keys">
        {LANDING_ALLOWED_BLOCK_KEYS.map((key) => (
          <option key={key} value={key} />
        ))}
      </datalist>

      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>{t('adminConsole.landingCms2')}</h1>
          <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '14px' }}>
            {t('adminConsole.reducedStructureModeHero3Proof')}
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setEditingLandingBlock(null);
            setNewLandingMessage('');
            setShowNewLandingBlockForm((current) => !current);
          }}
        >
          {showNewLandingBlockForm ? t('adminConsole.closeForm') : t('adminConsole.createBlock')}
        </button>
      </div>

      <div style={{ display: 'grid', gap: '20px' }}>
        {showNewLandingBlockForm ? (
          <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0, marginBottom: '12px' }}>{t('adminConsole.createBlock')}</h2>
            <form className="auth-form" onSubmit={submitNewLandingBlock}>
              <label>{t('adminConsole.blockKey')}<input value={newLandingBlock.block_key} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, block_key: e.target.value }))} placeholder="hero_main" list="landing-allowed-keys" required /></label>
              <label>{t('adminConsole.adminLabel')}<input value={newLandingBlock.label} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, label: e.target.value }))} /></label>
              <label>{t('adminConsole.title')}<input value={newLandingBlock.title} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, title: e.target.value }))} /></label>
              <label>{t('adminConsole.subtitle')}<input value={newLandingBlock.subtitle} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, subtitle: e.target.value }))} /></label>
              <label>{t('adminConsole.description')}<textarea rows={4} value={newLandingBlock.description} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, description: e.target.value }))} /></label>
              <label>{t('adminConsole.imageUrl2')}<input value={newLandingBlock.image_url} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, image_url: e.target.value }))} placeholder="https://..." /></label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label>{t('adminConsole.ctaLabel')}<input value={newLandingBlock.cta_label} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, cta_label: e.target.value }))} /></label>
                <label>{t('adminConsole.ctaLink')}<input value={newLandingBlock.cta_href} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, cta_href: e.target.value }))} /></label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label>{t('adminConsole.badge')}<input value={newLandingBlock.badge_text} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, badge_text: e.target.value }))} /></label>
                <label>{t('adminConsole.order')}<input type="number" min="0" value={newLandingBlock.display_order} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, display_order: e.target.value }))} /></label>
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={newLandingBlock.is_active} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, is_active: e.target.checked }))} />
                {t('adminConsole.activeBlock')}
              </label>
              <button type="submit" className="btn-primary" disabled={busySaveKey === `create:landing:${String(newLandingBlock.block_key || '').trim().toLowerCase()}`}>
                {busySaveKey === `create:landing:${String(newLandingBlock.block_key || '').trim().toLowerCase()}` ? t('adminConsole.saving') : t('adminConsole.createBlock2')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowNewLandingBlockForm(false);
                  setNewLandingMessage('');
                }}
              >
                {t('adminConsole.cancel')}
              </button>
            </form>
            {newLandingMessage ? <p className="session-meta" style={{ marginTop: '8px' }}>{newLandingMessage}</p> : null}
          </div>
        ) : null}

        {editingLandingBlock ? (
          <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-primary, #4f46e5)', borderRadius: '10px', padding: '20px 24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0, marginBottom: '12px' }}>{t('adminConsole.editBlock')}</h2>
            <form className="auth-form" onSubmit={submitEditLandingBlock}>
              <label>{t('adminConsole.blockKey')}<input value={editingLandingBlock.block_key} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, block_key: e.target.value }))} list="landing-allowed-keys" required /></label>
                <label>{t('adminConsole.adminLabel')}<input value={editingLandingBlock.label} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, label: e.target.value }))} /></label>
                <label>{t('adminConsole.title')}<input value={editingLandingBlock.title} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, title: e.target.value }))} /></label>
                <label>{t('adminConsole.subtitle')}<input value={editingLandingBlock.subtitle} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, subtitle: e.target.value }))} /></label>
                <label>{t('adminConsole.description')}<textarea rows={4} value={editingLandingBlock.description} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, description: e.target.value }))} /></label>
                <label>{t('adminConsole.imageUrl2')}<input value={editingLandingBlock.image_url} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, image_url: e.target.value }))} /></label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label>{t('adminConsole.ctaLabel')}<input value={editingLandingBlock.cta_label} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, cta_label: e.target.value }))} /></label>
                  <label>{t('adminConsole.ctaLink')}<input value={editingLandingBlock.cta_href} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, cta_href: e.target.value }))} /></label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label>{t('adminConsole.badge')}<input value={editingLandingBlock.badge_text} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, badge_text: e.target.value }))} /></label>
                  <label>{t('adminConsole.order')}<input type="number" min="0" value={editingLandingBlock.display_order} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, display_order: e.target.value }))} /></label>
                </div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={editingLandingBlock.is_active} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, is_active: e.target.checked }))} />
                  {t('adminConsole.activeBlock')}
                </label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button type="submit" className="btn-primary" disabled={busySaveKey === `save:landing:${String(editingLandingBlock.block_key || '').trim().toLowerCase()}`}>
                    {busySaveKey === `save:landing:${String(editingLandingBlock.block_key || '').trim().toLowerCase()}` ? t('adminConsole.saving') : t('adminConsole.save')}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setEditingLandingBlock(null)}>{t('adminConsole.cancel')}</button>
                </div>
            </form>
          </div>
        ) : null}

        <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
              {t('adminConsole.blocks')} {landingBlocks.length > 0 ? <span style={{ fontWeight: 400, color: 'var(--color-muted, #6b7280)', fontSize: '13px' }}>({filteredLandingBlocks.length}/{landingBlocks.length})</span> : null}
            </h2>
            <input
              type="search"
              className="inline-input"
              placeholder={t('adminConsole.searchABlock')}
              value={landingQuery}
              onChange={(e) => setLandingQuery(e.target.value)}
              style={{ width: 'min(360px, 100%)' }}
            />
          </div>

          <ul className="session-list" style={{ margin: 0 }}>
            {filteredLandingBlocks.length === 0 ? <li className="list-empty">{t('adminConsole.noMatchingBlock')}</li> : null}
            {filteredLandingBlocks.map((block) => (
              <li key={String(block.id)} className="session-item" style={{ alignItems: 'center' }}>
                <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                  <p className="session-title">{block.label || block.block_key}</p>
                  <p className="session-meta">{block.block_key} · {block.is_active ? t('adminConsole.active') : t('adminConsole.inactive')}</p>
                </div>
                <div className="session-item-actions icon-only-actions" style={{ flexShrink: 0 }}>
                  <button
                    type="button"
                    className="icon-action-btn"
                    onClick={() => beginEditLandingBlock(block)}
                    title={t('adminConsole.edit')}
                    aria-label={t('adminConsole.editLandingBlock')}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="icon-action-btn icon-action-danger"
                    onClick={() => handleDeleteLandingBlock(block)}
                    disabled={busyDeleteKey === `landing:${block.block_key}`}
                    title={t('adminConsole.delete')}
                    aria-label={t('adminConsole.deleteLandingBlock')}
                  >
                    {busyDeleteKey === `landing:${block.block_key}` ? '…' : '🗑'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
