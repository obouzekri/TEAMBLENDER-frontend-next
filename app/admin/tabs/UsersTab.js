"use client";

import { isPlatformAdminEmail } from '@/lib/admin/utils';

// Onglet « users » de la console admin : rendu seul, l'état et les actions restent dans AdminClient.
export default function UsersTab({
  beginEditUser,
  busyApprovalId,
  busyDeleteKey,
  busySaveKey,
  filteredUsers,
  handleAdminUserVerificationOverride,
  handleDeleteUser,
  handleResendVerificationLink,
  handleToggleUserStatus,
  newUser,
  newUserMessage,
  pendingUsers,
  setEditingUser,
  setNewUser,
  setNewUserMessage,
  setShowNewUserForm,
  setUserQuery,
  showNewUserForm,
  submitNewUser,
  t,
  updateApproval,
  user,
  userQuery,
  users,
}) {
  return (
    <div>
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>{t('adminConsole.users')}</h1>
          <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '14px' }}>{t('adminConsole.manageUserAccountsAndApprovalRequests')}</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setEditingUser(null);
            setNewUserMessage('');
            setShowNewUserForm((current) => !current);
          }}
        >
          {showNewUserForm ? t('adminConsole.closeForm') : t('adminConsole.createUser')}
        </button>
      </div>

      <div style={{ display: 'grid', gap: '20px' }}>
        <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0, marginBottom: '12px' }}>{t('adminConsole.pendingRequests')} {pendingUsers.length > 0 ? `(${pendingUsers.length})` : ''}</h2>
          {pendingUsers.length === 0 ? <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '13px' }}>{t('adminConsole.noPendingRequest')}</p> : null}
          {pendingUsers.length > 0 ? (
            <ul className="session-list" style={{ margin: 0 }}>
              {pendingUsers.map((u) => (
                <li key={String(u.id)} className="session-item" style={{ alignItems: 'center' }}>
                  <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                    <p className="session-title">{u.first_name || ''} {u.last_name || ''}</p>
                    <p className="session-meta">{u.email}</p>
                  </div>
                  <div className="session-item-actions" style={{ flexShrink: 0 }}>
                    <button type="button" className="btn-primary" disabled={busyApprovalId === u.id} onClick={() => updateApproval(u.id, 'approved')} style={{ fontSize: '12px', padding: '5px 10px' }}>{t('adminConsole.approve')}</button>
                    <button type="button" className="btn-secondary" disabled={busyApprovalId === u.id} onClick={() => updateApproval(u.id, 'rejected')} style={{ fontSize: '12px', padding: '5px 10px' }}>{t('adminConsole.reject')}</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {showNewUserForm ? (
          <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0, marginBottom: '12px' }}>{t('adminConsole.createAnAccount')}</h2>
            <form className="auth-form" onSubmit={submitNewUser} autoComplete="off">
              <input type="text" name="fake_username" autoComplete="username" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
              <input type="password" name="fake_password" autoComplete="current-password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
              <label>{t('adminConsole.firstName')}<input name="create_user_first_name" autoComplete="off" value={newUser.first_name} onChange={(e) => setNewUser((p) => ({ ...p, first_name: e.target.value }))} required /></label>
              <label>{t('adminConsole.lastName')}<input name="create_user_last_name" autoComplete="off" value={newUser.last_name} onChange={(e) => setNewUser((p) => ({ ...p, last_name: e.target.value }))} /></label>
              <label>Email<input type="email" name="create_user_email" autoComplete="off" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} required /></label>
              <label>{t('adminConsole.password')}<input type="password" name="create_user_password" autoComplete="new-password" minLength={8} value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} required /></label>
              <label>{t('adminConsole.role')}
                <select value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}>
                  <option value="user">{t('adminConsole.user')}</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                <button type="submit" className="btn-primary">{t('adminConsole.createAccount')}</button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowNewUserForm(false);
                    setNewUserMessage('');
                  }}
                >
                  {t('adminConsole.cancel')}
                </button>
              </div>
            </form>
            {newUserMessage ? <p className="session-meta" style={{ marginTop: '8px' }}>{newUserMessage}</p> : null}
          </div>
        ) : null}

        <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
              {t('adminConsole.list')} {users.length > 0 ? <span style={{ fontWeight: 400, color: 'var(--color-muted, #6b7280)', fontSize: '13px' }}>({filteredUsers.length}/{users.length})</span> : null}
            </h2>
            <input
              type="search"
              className="inline-input"
              placeholder={t('adminConsole.search')}
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              style={{ width: 'min(360px, 100%)' }}
            />
          </div>
          <ul className="session-list" style={{ margin: 0 }}>
            {filteredUsers.length === 0 ? <li className="list-empty">{t('adminConsole.noMatchingUser')}</li> : null}
            {filteredUsers.map((u) => (
              <li key={String(u.id)} className="session-item" style={{ alignItems: 'center' }}>
                <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                  <p className="session-title">{u.first_name || ''} {u.last_name || ''}</p>
                  <p className="session-meta">
                    {u.email} · {u.role || 'user'} · {u.disabled ? t('adminConsole.inactive') : t('adminConsole.active')}
                    {isPlatformAdminEmail(u.email) ? ` · ${t('adminConsole.verificationNotRequired')}` : ''}
                  </p>
                </div>
                <div className="session-item-actions icon-only-actions" style={{ flexShrink: 0 }}>
                  {!isPlatformAdminEmail(u.email) ? (
                    <button
                      type="button"
                      className="icon-action-btn"
                      onClick={() => handleAdminUserVerificationOverride(u)}
                      disabled={busySaveKey === `verify-admin:user:${u.id}`}
                      title={t('adminConsole.manualAdminVerification')}
                      aria-label={t('adminConsole.manualAdminVerification')}
                    >
                      {busySaveKey === `verify-admin:user:${u.id}` ? '…' : '✓'}
                    </button>
                  ) : null}
                  {!isPlatformAdminEmail(u.email) ? (
                    <button
                      type="button"
                      className="icon-action-btn"
                      onClick={() => handleResendVerificationLink(u)}
                      disabled={busySaveKey === `verify:user:${u.id}`}
                      title={t('adminConsole.resendVerificationLink')}
                      aria-label={t('adminConsole.resendVerificationLink')}
                    >
                      {busySaveKey === `verify:user:${u.id}` ? '…' : '✉'}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="icon-action-btn"
                    onClick={() => beginEditUser(u)}
                    title={t('adminConsole.edit')}
                    aria-label={t('adminConsole.editUser')}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="icon-action-btn"
                    onClick={() => handleToggleUserStatus(u)}
                    disabled={busySaveKey === `status:user:${u.id}` || String(u.id) === String(user?.id)}
                    title={u.disabled ? t('adminConsole.enable') : t('adminConsole.disable')}
                    aria-label={u.disabled ? t('adminConsole.enableUser') : t('adminConsole.disableUser')}
                  >
                    {busySaveKey === `status:user:${u.id}` ? '…' : u.disabled ? '↺' : '⏸'}
                  </button>
                  <button
                    type="button"
                    className="icon-action-btn icon-action-danger"
                    onClick={() => handleDeleteUser(u)}
                    disabled={busyDeleteKey === `user:${u.id}` || String(u.id) === String(user?.id)}
                    title={t('adminConsole.delete')}
                    aria-label={t('adminConsole.deleteUser')}
                  >
                    {busyDeleteKey === `user:${u.id}` ? '…' : '🗑'}
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
