"use client";

import { NUMERIC_DATE_TIME, formatDate } from '@/lib/i18n/format';
import { formatCurrency, formatDurationSeconds } from '@/lib/admin/utils';

// Onglet « analytics » de la console admin : rendu seul, l'état et les actions restent dans AdminClient.
export default function AnalyticsTab({
  analyticsDays,
  analyticsError,
  analyticsLoading,
  analyticsSnapshot,
  canExpandCitiesForCountry,
  displayedCitiesForAnalytics,
  effectiveSelectedCountry,
  exportAnalyticsCsv,
  loadAnalytics,
  locale,
  setAnalyticsDays,
  setSelectedVisitorCountry,
  setShowAllCitiesForCountry,
  showAllCitiesForCountry,
  t,
  visitorCountries,
}) {
  return (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>{t('adminConsole.posthogAnalytics')}</h1>
          <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '14px' }}>
            {t('adminConsole.summaryOfTheLastLookbackdaysDays', { lookbackDays: analyticsSnapshot.lookbackDays })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {[7, 30, 90].map((days) => (
            <button
              key={`analytics-period-${days}`}
              type="button"
              className="btn-secondary"
              onClick={() => setAnalyticsDays(days)}
              disabled={analyticsLoading || analyticsDays === days}
              style={{
                fontSize: '12px',
                padding: '6px 10px',
                borderColor: analyticsDays === days ? 'var(--color-primary, #4f46e5)' : undefined,
                color: analyticsDays === days ? 'var(--color-primary, #4f46e5)' : undefined,
              }}
            >
              {days}{t('adminConsole.d')}
            </button>
          ))}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => loadAnalytics()}
            disabled={analyticsLoading}
            style={{ fontSize: '12px', padding: '6px 10px' }}
          >
            {analyticsLoading ? t('adminConsole.refreshing') : t('adminConsole.refresh')}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={exportAnalyticsCsv}
            disabled={analyticsLoading || !analyticsSnapshot.configured || analyticsSnapshot.degraded || Boolean(analyticsError)}
            style={{ fontSize: '12px', padding: '6px 10px' }}
          >
            {t('adminConsole.exportCsv')}
          </button>
        </div>
      </div>

      <div className="admin-panel-card" style={{ marginBottom: '16px' }}>
        {analyticsSnapshot.configured ? (
          <p style={{ margin: 0, fontSize: '13px', color: analyticsSnapshot.degraded ? 'var(--color-warning, #b45309)' : 'var(--color-success, #15803d)', fontWeight: 600 }}>
            {analyticsSnapshot.degraded
              ? t('adminConsole.posthogUnavailableDegradedMode')
              : t('adminConsole.posthogConnected')}
          </p>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-warning, #b45309)', fontWeight: 600 }}>{t('adminConsole.analyticsNotConfigured')}</p>
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--color-muted, #6b7280)', lineHeight: 1.55 }}>
              {t('adminConsole.add')}<code style={{ fontFamily: 'monospace', background: 'var(--color-code-bg, #f3f4f6)', padding: '1px 4px', borderRadius: '3px' }}>POSTHOG_PROJECT_ID</code>{t('adminConsole.and')}
              <code style={{ fontFamily: 'monospace', background: 'var(--color-code-bg, #f3f4f6)', padding: '1px 4px', borderRadius: '3px' }}>POSTHOG_PERSONAL_API_KEY</code>{' '}
              {t('adminConsole.toTheBackend')}<code style={{ fontFamily: 'monospace', background: 'var(--color-code-bg, #f3f4f6)', padding: '1px 4px', borderRadius: '3px' }}>.env</code>{t('adminConsole.fileThenRestartTheServer')}
            </p>
          </>
        )}
        {analyticsSnapshot.configured && analyticsSnapshot.degraded && analyticsSnapshot.reason ? (
          <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--color-warning-dark, #92400e)', lineHeight: 1.5 }}>
            {t('adminConsole.reason')}: {analyticsSnapshot.reason}
          </p>
        ) : null}
        {analyticsSnapshot.errorCode === 'POSTHOG_AUTHENTICATION_FAILED' || analyticsSnapshot.errorCode === 'POSTHOG_ACCESS_DENIED' ? (
          <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--color-warning-dark, #92400e)', lineHeight: 1.5 }}>
            {analyticsSnapshot.errorCode === 'POSTHOG_AUTHENTICATION_FAILED'
              ? t('adminConsole.replacePosthogPersonalApiKeyWith')
              : t('adminConsole.checkThatThePersonalApiKey')}
          </p>
        ) : null}
        {analyticsSnapshot.generatedAt ? (
          <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'var(--color-muted, #6b7280)' }}>
            {t('adminConsole.generatedAt')} {formatDate(analyticsSnapshot.generatedAt, locale, NUMERIC_DATE_TIME)}
          </p>
        ) : null}
        {analyticsError ? (
          <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#b45309' }}>
            {t('adminConsole.dataTemporarilyUnavailable')}: {analyticsError}
          </p>
        ) : null}
      </div>

      {analyticsLoading ? (
        <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
          <p style={{ margin: 0, color: 'var(--color-muted, #6b7280)' }}>{t('adminConsole.loadingAnalyticsData')}</p>
        </div>
      ) : null}

      <div className="admin-stat-grid" style={{ marginBottom: '16px' }}>
        {[
          { label: t('adminConsole.activeUsers'), value: Number(analyticsSnapshot.users.totalActive || 0) },
          { label: t('adminConsole.newUsers'), value: Number(analyticsSnapshot.users.newUsers || 0) },
          { label: t('adminConsole.returningUsers'), value: Number(analyticsSnapshot.users.returningUsers || 0) },
          { label: t('adminConsole.pageViews'), value: Number(analyticsSnapshot.engagement.pageViews || 0) },
          { label: t('adminConsole.averageSessionDuration'), value: formatDurationSeconds(analyticsSnapshot.engagement.avgSessionDurationSec) },
          { label: t('adminConsole.signups'), value: Number(analyticsSnapshot.conversion.signupCount || 0) },
          { label: t('adminConsole.purchasesCheckout'), value: Number(analyticsSnapshot.conversion.purchaseCount || 0) },
          { label: t('adminConsole.keyActionSessionsCreated'), value: Number(analyticsSnapshot.conversion.keyActionCount || 0) },
          { label: t('adminConsole.averageLoadTime'), value: `${Math.round(Number(analyticsSnapshot.performance.avgPageLoadMs || 0))} ms` },
          { label: t('adminConsole.frontendErrors'), value: Number(analyticsSnapshot.performance.frontendErrorCount || 0) },
          {
            label: `${t('adminConsole.revenue')} (${String(analyticsSnapshot.business.currency || 'EUR').toUpperCase()})`,
            value: formatCurrency(analyticsSnapshot.business.revenue, analyticsSnapshot.business.currency),
          },
          {
            label: t('adminConsole.averageBasket'),
            value: formatCurrency(analyticsSnapshot.business.avgBasket, analyticsSnapshot.business.currency),
          },
        ].map((item) => (
          <div key={item.label} style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '14px 12px' }}>
            <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '20px', color: 'var(--color-text, #111)' }}>{!analyticsSnapshot.configured || analyticsSnapshot.degraded ? t('adminConsole.unavailable') : item.value}</p>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-muted, #6b7280)' }}>{item.label}</p>
          </div>
        ))}
      </div>

      {analyticsSnapshot.configured && !analyticsSnapshot.degraded ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          {[
            {
              title: t('adminConsole.topCountries'),
              list: visitorCountries,
              interactive: true,
            },
            {
              title: effectiveSelectedCountry
                ? `${t('adminConsole.cities')} - ${effectiveSelectedCountry}`
                : t('adminConsole.topCities'),
              list: displayedCitiesForAnalytics,
              expandable: canExpandCitiesForCountry,
            },
            { title: t('adminConsole.topBrowsers'), list: Array.isArray(analyticsSnapshot.visitors.browsers) ? analyticsSnapshot.visitors.browsers : [] },
            { title: t('adminConsole.topSystems'), list: Array.isArray(analyticsSnapshot.visitors.os) ? analyticsSnapshot.visitors.os : [] },
          ].map((block) => (
            <div key={block.title} style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '14px 14px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 700 }}>{block.title}</p>
              {block.list.length > 0 ? (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {block.list.slice(0, 6).map((item) => (
                    <li key={`${block.title}-${item.label}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '12px' }}>
                      {block.interactive ? (
                        <button
                          type="button"
                          onClick={() => setSelectedVisitorCountry(String(item.label || '').trim())}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            padding: 0,
                            margin: 0,
                            textAlign: 'start',
                            cursor: 'pointer',
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: String(item.label || '').trim() === effectiveSelectedCountry
                              ? 'var(--color-primary, #4f46e5)'
                              : 'var(--color-text, #111)',
                            fontWeight: String(item.label || '').trim() === effectiveSelectedCountry ? 700 : 400,
                          }}
                          title={t('adminConsole.showCitiesForLabel', { label: item.label })}
                        >
                          {item.label}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--color-text, #111)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                      )}
                      <strong style={{ color: 'var(--color-primary, #4f46e5)', flexShrink: 0 }}>{item.value}</strong>
                    </li>
                  ))}
                </ul>
              ) : null}
              {block.expandable ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAllCitiesForCountry((current) => !current)}
                  style={{ marginTop: '10px', fontSize: '12px', padding: '4px 8px' }}
                >
                  {showAllCitiesForCountry ? t('adminConsole.showLess') : t('adminConsole.showAllCities')}
                </button>
              ) : (
                block.list.length === 0 ? <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-muted, #6b7280)' }}>{t('adminConsole.noDataAvailable')}</p> : null
              )}
            </div>
          ))}
        </div>
      ) : null}


    </div>
  );
}
