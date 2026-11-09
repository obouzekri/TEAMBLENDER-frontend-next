'use client';

export default function AdminDashboardPanel({
  t,
  userLabel,
  stats,
  visitSummary,
  activityLoading,
  visits,
  locale,
  formatDateTime,
  pendingUsers,
  busyApprovalId,
  onApproval,
}) {
  return (
    <div>
      <div className="admin-page-hero admin-page-hero--dashboard">
        <div>
          <p className="admin-page-hero__eyebrow">{t('adminConsole.operationsCenter')}</p>
          <h1 style={{ fontSize: '26px', fontWeight: 700, margin: '0 0 6px' }}>{t('adminConsole.dashboard')}</h1>
          <p className="admin-page-hero__text">{t('adminConsole.platformOverviewInRealTime')}</p>
        </div>
        <div className="admin-page-hero__pill">{userLabel}</div>
      </div>
      <div className="admin-stat-grid" style={{ marginBottom: '24px' }}>
        {[
          { value: stats.users, label: t('adminConsole.users') },
          { value: stats.activeUsers, label: t('adminConsole.activeUsers') },
          { value: stats.disabledUsers, label: t('adminConsole.inactiveUsers') },
          { value: stats.pending, label: t('adminConsole.pendingRequests'), highlight: stats.pending > 0 },
          { value: stats.participants, label: 'Participants' },
          { value: stats.activeParticipants, label: t('adminConsole.activeParticipants') },
          { value: stats.sessions, label: 'Sessions' },
          { value: stats.activeSessions, label: t('adminConsole.liveSessions'), highlight: stats.activeSessions > 0 },
          { value: stats.challenges, label: 'Challenges' },
          { value: stats.pricingPlans, label: t('adminConsole.pricingPlans') },
          { value: stats.landingBlocks, label: t('adminConsole.landingCmsBlocks') },
        ].map((item) => (
          <div key={item.label} className={`admin-stat-card${item.highlight ? ' admin-stat-card--highlight' : ''}`}>
            <p className="admin-stat-card__value">{item.value}</p>
            <p className="admin-stat-card__label">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="admin-panel-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px' }}>{t('adminConsole.recentAdminActivity')}</h2>
            <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '13px' }}>
              {t('adminConsole.totalvisitsVisitsRecordedInTheLast', { totalVisits: visitSummary.totalVisits })}
            </p>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted, #6b7280)', textAlign: 'end' }}>
            <div><strong style={{ color: 'var(--color-primary, #4f46e5)' }}>{visitSummary.totalVisits}</strong> {t('adminConsole.visits')}</div>
            <div>{visitSummary.uniqueUsers} {t('adminConsole.activeUsers2')}</div>
          </div>
        </div>

        {activityLoading ? (
          <p style={{ margin: 0, color: 'var(--color-muted, #6b7280)', fontSize: '13px' }}>{t('adminConsole.loadingActivity')}</p>
        ) : visits.length > 0 ? (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {visits.map((visit) => (
              <li key={String(visit.id || `${visit.page || 'visit'}-${visit.createdAt || visit.created_at || Math.random()}`)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 0', borderTop: '1px solid var(--color-border, #e5e7eb)' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 600, margin: '0 0 2px', fontSize: '14px' }}>{String(visit.page || '/admin').trim() || '/admin'}</p>
                  <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '12px' }}>
                    {String(visit.eventType || 'page_view').trim() || 'page_view'} · {visit.userEmail || t('adminConsole.unknownUser')}
                  </p>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-muted, #6b7280)', textAlign: 'end', flexShrink: 0 }}>
                  <div>{visit.createdAt ? formatDateTime(visit.createdAt, locale) : t('adminConsole.justNow')}</div>
                  <div>{visit.userRole || 'admin'}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, color: 'var(--color-muted, #6b7280)', fontSize: '13px' }}>{t('adminConsole.noVisitActivityHasBeenRecorded')}</p>
        )}
      </div>

      {pendingUsers.length > 0 ? (
        <div className="admin-panel-card admin-panel-card--accent">
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginTop: 0, marginBottom: '16px' }}>{t('adminConsole.pendingRequests')} ({pendingUsers.length})</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingUsers.map((pendingUser) => (
              <li key={String(pendingUser.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '12px 0', borderBottom: '1px solid var(--color-border, #e5e7eb)' }}>
                <div>
                  <p style={{ fontWeight: 600, margin: '0 0 2px', fontSize: '14px' }}>{pendingUser.first_name || ''} {pendingUser.last_name || ''}</p>
                  <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '13px' }}>{pendingUser.email}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button type="button" className="btn-primary" disabled={busyApprovalId === pendingUser.id} onClick={() => onApproval(pendingUser.id, 'approved')} style={{ fontSize: '13px', padding: '6px 14px' }}>{t('adminConsole.approve')}</button>
                  <button type="button" className="btn-secondary" disabled={busyApprovalId === pendingUser.id} onClick={() => onApproval(pendingUser.id, 'rejected')} style={{ fontSize: '13px', padding: '6px 14px' }}>{t('adminConsole.reject')}</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}