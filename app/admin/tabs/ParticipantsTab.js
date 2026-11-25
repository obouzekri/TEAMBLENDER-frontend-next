"use client";

import { getParticipantDisplayName } from '@/lib/admin/utils';

// Onglet « participants » de la console admin : rendu seul, l'état et les actions restent dans AdminClient.
export default function ParticipantsTab({
  beginEditParticipant,
  busyDeleteKey,
  busySaveKey,
  filteredParticipants,
  handleAdminParticipantVerificationOverride,
  handleDeleteParticipant,
  handleResendParticipantVerificationLink,
  handleToggleParticipantStatus,
  newParticipant,
  newParticipantMessage,
  participantQuery,
  participants,
  setEditingParticipant,
  setNewParticipant,
  setNewParticipantMessage,
  setParticipantQuery,
  setShowNewParticipantForm,
  showNewParticipantForm,
  submitNewParticipant,
  t,
  users,
}) {
  return (
    <div>
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>{t('adminConsole.participants')}</h1>
          <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '14px' }}>{t('adminConsole.manageParticipantAccountsLinkedToUsers')}</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setEditingParticipant(null);
            setNewParticipantMessage('');
            setShowNewParticipantForm((current) => !current);
          }}
        >
          {showNewParticipantForm ? t('adminConsole.closeForm') : t('adminConsole.createParticipant')}
        </button>
      </div>

      <div style={{ display: 'grid', gap: '20px' }}>
        {showNewParticipantForm ? (
          <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0, marginBottom: '12px' }}>{t('adminConsole.createParticipant')}</h2>
            <form className="auth-form" onSubmit={submitNewParticipant} autoComplete="off">
              <input type="text" name="fake_participant_username" autoComplete="username" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
              <input type="password" name="fake_participant_password" autoComplete="current-password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
              <label>{t('adminConsole.owner')}
                <select value={newParticipant.owner_id} onChange={(e) => setNewParticipant((prev) => ({ ...prev, owner_id: e.target.value }))} required>
                  <option value="">{t('adminConsole.selectAUser')}</option>
                  {users.filter((u) => String(u.role || '') === 'user').map((u) => (
                    <option key={String(u.id)} value={String(u.id)}>{u.first_name || ''} {u.last_name || ''} ({u.email})</option>
                  ))}
                </select>
              </label>
              <label>{t('adminConsole.firstName')}<input name="create_participant_first_name" autoComplete="off" value={newParticipant.first_name} onChange={(e) => setNewParticipant((prev) => ({ ...prev, first_name: e.target.value }))} required /></label>
              <label>{t('adminConsole.lastName')}<input name="create_participant_last_name" autoComplete="off" value={newParticipant.last_name} onChange={(e) => setNewParticipant((prev) => ({ ...prev, last_name: e.target.value }))} /></label>
              <label>Email<input type="email" name="create_participant_email" autoComplete="off" value={newParticipant.email} onChange={(e) => setNewParticipant((prev) => ({ ...prev, email: e.target.value }))} required /></label>
              <label>{t('adminConsole.password')}<input type="password" name="create_participant_password" autoComplete="new-password" minLength={8} value={newParticipant.password} onChange={(e) => setNewParticipant((prev) => ({ ...prev, password: e.target.value }))} required /></label>
              <label>{t('adminConsole.jobTitle')}<input value={newParticipant.job_title} onChange={(e) => setNewParticipant((prev) => ({ ...prev, job_title: e.target.value }))} /></label>
              <label>{t('adminConsole.department')}<input value={newParticipant.department} onChange={(e) => setNewParticipant((prev) => ({ ...prev, department: e.target.value }))} /></label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                <button type="submit" className="btn-primary" disabled={busySaveKey === 'create:participant'}>{busySaveKey === 'create:participant' ? t('adminConsole.creating') : t('adminConsole.createParticipant2')}</button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowNewParticipantForm(false);
                    setNewParticipantMessage('');
                  }}
                >
                  {t('adminConsole.cancel')}
                </button>
              </div>
            </form>
            {newParticipantMessage ? <p className="session-meta" style={{ marginTop: '8px' }}>{newParticipantMessage}</p> : null}
          </div>
        ) : null}

        <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
              {t('adminConsole.list')} {participants.length > 0 ? <span style={{ fontWeight: 400, color: 'var(--color-muted, #6b7280)', fontSize: '13px' }}>({filteredParticipants.length}/{participants.length})</span> : null}
            </h2>
            <input
              type="search"
              className="inline-input"
              placeholder={t('adminConsole.search')}
              value={participantQuery}
              onChange={(e) => setParticipantQuery(e.target.value)}
              style={{ width: 'min(360px, 100%)' }}
            />
          </div>
          <ul className="session-list" style={{ margin: 0 }}>
            {filteredParticipants.length === 0 ? <li className="list-empty">{t('adminConsole.noMatchingParticipant')}</li> : null}
            {filteredParticipants.map((p) => (
              <li key={String(p.id)} className="session-item" style={{ alignItems: 'center' }}>
                <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                  <p className="session-title">{getParticipantDisplayName(p)}</p>
                  <p className="session-meta">{p.email} · {p.disabled ? t('adminConsole.inactive') : t('adminConsole.active')} · {p.creator?.email || `${t('adminConsole.owner')} #${p.created_by || '?'}`}</p>
                </div>
                <div className="session-item-actions icon-only-actions" style={{ flexShrink: 0 }}>
                  <button
                    type="button"
                    className="icon-action-btn"
                    onClick={() => handleAdminParticipantVerificationOverride(p)}
                    disabled={busySaveKey === `verify-admin:participant:${p.id}`}
                    title={t('adminConsole.manualAdminVerification')}
                    aria-label={t('adminConsole.manualParticipantVerification')}
                  >
                    {busySaveKey === `verify-admin:participant:${p.id}` ? '…' : '✓'}
                  </button>
                  <button
                    type="button"
                    className="icon-action-btn"
                    onClick={() => handleResendParticipantVerificationLink(p)}
                    disabled={busySaveKey === `verify:participant:${p.id}`}
                    title={t('adminConsole.resendVerificationLink')}
                    aria-label={t('adminConsole.resendParticipantVerificationLink')}
                  >
                    {busySaveKey === `verify:participant:${p.id}` ? '…' : '✉'}
                  </button>
                  <button
                    type="button"
                    className="icon-action-btn"
                    onClick={() => beginEditParticipant(p)}
                    title={t('adminConsole.edit')}
                    aria-label={t('adminConsole.editParticipant')}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="icon-action-btn"
                    onClick={() => handleToggleParticipantStatus(p)}
                    disabled={busySaveKey === `status:participant:${p.id}`}
                    title={p.disabled ? t('adminConsole.enable') : t('adminConsole.disable')}
                    aria-label={p.disabled ? t('adminConsole.enableParticipant') : t('adminConsole.disableParticipant')}
                  >
                    {busySaveKey === `status:participant:${p.id}` ? '…' : p.disabled ? '↺' : '⏸'}
                  </button>
                  <button
                    type="button"
                    className="icon-action-btn icon-action-danger"
                    onClick={() => handleDeleteParticipant(p)}
                    disabled={busyDeleteKey === `participant:${p.id}`}
                    title={t('adminConsole.delete')}
                    aria-label={t('adminConsole.deleteParticipant')}
                  >
                    {busyDeleteKey === `participant:${p.id}` ? '…' : '🗑'}
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
