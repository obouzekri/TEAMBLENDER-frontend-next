"use client";

// Dev-only warning panel surfaced when NEXT_PUBLIC_LANDING_CMS_STRICT is enabled.
export default function LandingCmsAuditPanel({ locale, isStrict, loaded, cmsAudit }) {
  if (!isStrict || !loaded) return null;
  if (cmsAudit.missingKeys.length === 0 && cmsAudit.missingFields.length === 0) return null;

  return (
    <section className="feature-card" aria-label="Audit Landing CMS" style={{ borderColor: 'var(--color-warning, #f59e0b)', background: 'var(--color-surface, #fff)' }}>
      <p className="eyebrow" style={{ color: 'var(--color-warning-dark, #9a3412)' }}>Audit CMS Strict</p>
      <h2 style={{ marginTop: 0 }}>{locale === 'en' ? 'Incomplete CMS coverage' : 'Couverture CMS incomplete'}</h2>
      <p style={{ marginBottom: '0.4rem' }}>
        {locale === 'en'
          ? 'Complete missing block keys before removing local defaults.'
          : 'Completer les block_key manquants avant suppression des defaults locaux.'}
      </p>
      {cmsAudit.missingKeys.length > 0 ? (
        <p className="session-meta" style={{ margin: '0.2rem 0' }}>
          {locale === 'en' ? 'Missing keys:' : 'Cles manquantes:'} {cmsAudit.missingKeys.join(', ')}
        </p>
      ) : null}
      {cmsAudit.missingFields.length > 0 ? (
        <p className="session-meta" style={{ margin: '0.2rem 0' }}>
          {locale === 'en' ? 'Incomplete fields:' : 'Champs incomplets:'} {cmsAudit.missingFields.map((entry) => `${entry.key} (${entry.fields.join(', ')})`).join(' | ')}
        </p>
      ) : null}
    </section>
  );
}
