"use client";

import { SESSION_MODALITY_OPTION_LABELS, SESSION_STATUS_OPTION_LABELS } from '@/lib/admin/constants';
import {
  getLocalizedLabel,
  getParticipantDisplayName,
  getSessionModalityLabel,
  getSessionStatusLabel,
} from '@/lib/admin/utils';

// Onglet « sessions » de la console admin : rendu seul, l'état et les actions restent dans AdminClient.
export default function SessionsTab({
  beginEditSession,
  busyDeleteKey,
  busySaveKey,
  editingSession,
  filteredAssignableMembers,
  filteredSessions,
  getSessionOwnerLabel,
  handleDeleteSession,
  locale,
  newSession,
  newSessionMemberIds,
  newSessionMemberQuery,
  newSessionMessage,
  sessionQuery,
  sessions,
  setEditingSession,
  setNewSession,
  setNewSessionMemberIds,
  setNewSessionMemberQuery,
  setNewSessionMessage,
  setSessionQuery,
  setShowNewSessionForm,
  showNewSessionForm,
  submitEditSession,
  submitNewSession,
  t,
  toggleNewSessionMember,
}) {
  return (
    <div>
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>{t('adminConsole.sessions')}</h1>
          <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '14px' }}>{t('adminConsole.createSuperviseAndUpdateSessionsFrom')}</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setEditingSession(null);
            setNewSessionMessage('');
            setShowNewSessionForm((current) => !current);
          }}
        >
          {showNewSessionForm ? t('adminConsole.closeForm') : t('adminConsole.createSession')}
        </button>
      </div>

      <div style={{ display: 'grid', gap: '20px' }}>
        {showNewSessionForm ? (
          <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0, marginBottom: '12px' }}>{t('adminConsole.createSession')}</h2>
            <form className="auth-form" onSubmit={submitNewSession}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted, #6b7280)' }}>{t('adminConsole.step1')}</p>
              <label>{t('adminConsole.name')}<input value={newSession.name} onChange={(e) => setNewSession((p) => ({ ...p, name: e.target.value }))} required /></label>
              <label>{t('adminConsole.status')}
                <select value={newSession.status} onChange={(e) => setNewSession((p) => ({ ...p, status: e.target.value }))}>
                  <option value="preparee">{getLocalizedLabel(SESSION_STATUS_OPTION_LABELS.preparee, locale)}</option>
                  <option value="en_cours">{getLocalizedLabel(SESSION_STATUS_OPTION_LABELS.en_cours, locale)}</option>
                  <option value="terminee">{getLocalizedLabel(SESSION_STATUS_OPTION_LABELS.terminee, locale)}</option>
                </select>
              </label>
              <label>{t('adminConsole.format')}<input value={newSession.format} onChange={(e) => setNewSession((p) => ({ ...p, format: e.target.value }))} placeholder={t('adminConsole.exampleWorkshop')} /></label>
              <label>{t('adminConsole.modality')}
                <select value={newSession.modality} onChange={(e) => setNewSession((p) => ({ ...p, modality: e.target.value }))}>
                  <option value="">{getLocalizedLabel(SESSION_MODALITY_OPTION_LABELS[''], locale)}</option>
                  <option value="remote">{getLocalizedLabel(SESSION_MODALITY_OPTION_LABELS.remote, locale)}</option>
                  <option value="hybrid">{getLocalizedLabel(SESSION_MODALITY_OPTION_LABELS.hybrid, locale)}</option>
                  <option value="in-person">{getLocalizedLabel(SESSION_MODALITY_OPTION_LABELS['in-person'], locale)}</option>
                </select>
              </label>
              <label>{t('adminConsole.date')}<input type="date" value={newSession.session_date} onChange={(e) => setNewSession((p) => ({ ...p, session_date: e.target.value }))} /></label>
              <label>{t('adminConsole.durationMinutes')}<input type="number" min={1} value={newSession.duration_minutes} onChange={(e) => setNewSession((p) => ({ ...p, duration_minutes: e.target.value }))} /></label>

              <div style={{ border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '12px' }}>
                <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted, #6b7280)' }}>{t('adminConsole.step2Optional')}</p>
                <p style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--color-muted, #6b7280)' }}>
                  {t('adminConsole.assignParticipantsNowSoTheyCan')}
                </p>
                <input
                  type="search"
                  className="inline-input"
                  placeholder={t('adminConsole.searchAParticipant')}
                  value={newSessionMemberQuery}
                  onChange={(e) => setNewSessionMemberQuery(e.target.value)}
                  style={{ marginBottom: '8px' }}
                />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setNewSessionMemberIds(filteredAssignableMembers.map((m) => String(m.id)))}
                    disabled={filteredAssignableMembers.length === 0}
                  >
                    {t('adminConsole.selectAll')}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setNewSessionMemberIds([])}
                    disabled={newSessionMemberIds.length === 0}
                  >
                    {t('adminConsole.unselectAll')}
                  </button>
                </div>
                <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '8px', padding: '8px' }}>
                  {filteredAssignableMembers.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-muted, #6b7280)' }}>{t('adminConsole.noParticipantAvailable')}</p>
                  ) : (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '6px' }}>
                      {filteredAssignableMembers.map((member) => {
                        const selected = newSessionMemberIds.includes(String(member.id));
                        return (
                          <li key={String(member.id)}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleNewSessionMember(member.id)}
                              />
                              <span style={{ fontSize: '13px' }}>
                                {getParticipantDisplayName(member)}
                                {member.email ? <span style={{ color: 'var(--color-muted, #6b7280)' }}> · {member.email}</span> : null}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <p className="session-meta" style={{ marginTop: '8px' }}>
                  {t('adminConsole.lengthParticipantValueAssigned', { length: newSessionMemberIds.length, value: newSessionMemberIds.length > 1 ? 's' : '' })}
                </p>
              </div>

              <button type="submit" className="btn-primary" disabled={busySaveKey === 'create:session'}>
                {busySaveKey === 'create:session' ? t('adminConsole.creating') : t('adminConsole.createSession2')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowNewSessionForm(false);
                  setNewSessionMessage('');
                }}
              >
                {t('adminConsole.cancel')}
              </button>
            </form>
            {newSessionMessage ? <p className="session-meta" style={{ marginTop: '8px' }}>{newSessionMessage}</p> : null}
          </div>
        ) : null}

        {editingSession ? (
          <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-primary, #4f46e5)', borderRadius: '10px', padding: '20px 24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0, marginBottom: '12px' }}>{t('adminConsole.editSession')}</h2>
            <form className="auth-form" onSubmit={submitEditSession}>
                <label>{t('adminConsole.name')}<input value={editingSession.name} onChange={(e) => setEditingSession((p) => ({ ...p, name: e.target.value }))} required /></label>
                <label>{t('adminConsole.status')}
                  <select value={editingSession.status} onChange={(e) => setEditingSession((p) => ({ ...p, status: e.target.value }))}>
                    <option value="preparee">{getSessionStatusLabel('preparee', locale)}</option>
                    <option value="en_cours">{getSessionStatusLabel('en_cours', locale)}</option>
                    <option value="terminee">{getSessionStatusLabel('terminee', locale)}</option>
                  </select>
                </label>
                <label>{t('adminConsole.format')}<input value={editingSession.format} onChange={(e) => setEditingSession((p) => ({ ...p, format: e.target.value }))} /></label>
                <label>{t('adminConsole.modality')}
                  <select value={editingSession.modality} onChange={(e) => setEditingSession((p) => ({ ...p, modality: e.target.value }))}>
                    <option value="">{getSessionModalityLabel('', locale)}</option>
                    <option value="remote">{getSessionModalityLabel('remote', locale)}</option>
                    <option value="hybrid">{getSessionModalityLabel('hybrid', locale)}</option>
                    <option value="in-person">{getSessionModalityLabel('in-person', locale)}</option>
                  </select>
                </label>
                <label>{t('adminConsole.date')}<input type="date" value={editingSession.session_date} onChange={(e) => setEditingSession((p) => ({ ...p, session_date: e.target.value }))} /></label>
                <label>{t('adminConsole.durationMinutes')}<input type="number" min={1} value={editingSession.duration_minutes} onChange={(e) => setEditingSession((p) => ({ ...p, duration_minutes: e.target.value }))} /></label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button type="submit" className="btn-primary" disabled={busySaveKey === `save:session:${editingSession.id}`}>{busySaveKey === `save:session:${editingSession.id}` ? t('adminConsole.saving') : t('adminConsole.save')}</button>
                  <button type="button" className="btn-secondary" onClick={() => setEditingSession(null)}>{t('adminConsole.cancel')}</button>
                </div>
            </form>
          </div>
        ) : null}

        <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
              {t('adminConsole.list')} {sessions.length > 0 ? <span style={{ fontWeight: 400, color: 'var(--color-muted, #6b7280)', fontSize: '13px' }}>({filteredSessions.length}/{sessions.length})</span> : null}
            </h2>
            <input
              type="search"
              className="inline-input"
              placeholder={t('adminConsole.search')}
              value={sessionQuery}
              onChange={(e) => setSessionQuery(e.target.value)}
              style={{ width: 'min(360px, 100%)' }}
            />
          </div>
          <ul className="session-list" style={{ margin: 0 }}>
            {filteredSessions.length === 0 ? <li className="list-empty">{t('adminConsole.noMatchingSession')}</li> : null}
            {filteredSessions.map((s) => (
              <li key={String(s.id)} className="session-item" style={{ alignItems: 'center' }}>
                <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                  <p className="session-title">{s.name || `Session #${s.id}`}</p>
                  <p className="session-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className={`status-pill status-${s.status || 'preparee'}`}>
                      {getSessionStatusLabel(s.status, locale)}
                    </span>
                    {s.modality ? <span>{t('adminConsole.modality')}: {getSessionModalityLabel(s.modality, locale) || s.modality}</span> : null}
                    <span>{t('adminConsole.owner')}: {getSessionOwnerLabel(s)}</span>
                  </p>
                </div>
                <div className="session-item-actions" style={{ flexShrink: 0 }}>
                  <button type="button" className="btn-secondary" onClick={() => beginEditSession(s)}>{t('adminConsole.edit')}</button>
                  <button type="button" className="btn-secondary" onClick={() => handleDeleteSession(s)} disabled={busyDeleteKey === `session:${s.id}`}>
                    {busyDeleteKey === `session:${s.id}` ? '...' : t('adminConsole.delete')}
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
