"use client";

// Per-language copy of a pricing plan (`localized_content`), as shown on /pricing and in the account area.
import { useState } from 'react';
import { ALL_LOCALES, DEFAULT_LOCALE, LOCALE_META } from '@/lib/i18n/routing';
import { getPricingPlanPriceLabel, PRICING_LOCALIZED_TEXT_FIELDS } from '@/lib/pricing-plan-content';

const FIELD_LABEL_KEYS = {
  name: 'adminConsole.pricingContentName',
  description: 'adminConsole.pricingContentDescription',
  badge: 'adminConsole.pricingContentBadge',
  cta_label: 'adminConsole.pricingContentCta',
  price_label: 'adminConsole.pricingContentPriceLabel',
  price_monthly_label: 'adminConsole.pricingContentPriceMonthlyLabel',
  price_annual_label: 'adminConsole.pricingContentPriceAnnualLabel',
  price_prefix_label: 'adminConsole.pricingContentPricePrefixLabel',
  price_secondary_label: 'adminConsole.pricingContentPriceSecondaryLabel',
};

const SHORT_TEXT_FIELDS = ['badge', 'cta_label'];
const PRICE_FIELDS = ['price_label', 'price_monthly_label', 'price_annual_label', 'price_prefix_label', 'price_secondary_label'];

function toCents(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : null;
}

function hasContent(fields) {
  if (!fields) return false;
  return [...PRICING_LOCALIZED_TEXT_FIELDS, 'features'].some((field) => String(fields[field] ?? '').trim());
}

export default function PricingLocalizedContentEditor({ draft, setDraft, t, locale, idPrefix }) {
  const extraLocales = Object.keys(draft?.localized || {}).filter((code) => !ALL_LOCALES.includes(code));
  const locales = [...ALL_LOCALES, ...extraLocales];
  const [activeLocale, setActiveLocale] = useState(locales.includes(locale) ? locale : DEFAULT_LOCALE);
  const fields = draft?.localized?.[activeLocale] || {};
  const filled = hasContent(fields);

  function updateField(field, value) {
    setDraft((prev) => ({
      ...prev,
      localized: {
        ...(prev.localized || {}),
        [activeLocale]: { ...((prev.localized || {})[activeLocale] || {}), [field]: value },
      },
    }));
  }

  const computedPrice = getPricingPlanPriceLabel(
    { price_cents: toCents(draft?.price) ?? 0, currency: draft?.currency || 'EUR' },
    {},
    'monthly',
    activeLocale,
  );
  const inputId = (field) => `${idPrefix}-${activeLocale}-${field}`;

  return (
    <fieldset style={{ border: '1px solid var(--line, #e5e7eb)', borderRadius: '10px', padding: '14px 16px', margin: '4px 0', minWidth: 0 }}>
      <legend style={{ fontWeight: 700, fontSize: '14px', padding: '0 6px' }}>{t('adminConsole.pricingPublicContent')}</legend>
      <p className="session-meta" style={{ marginTop: 0 }}>{t('adminConsole.pricingPublicContentHelp')}</p>

      <div role="group" aria-label={t('adminConsole.pricingContentLanguage')} style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
        {locales.map((code) => {
          const isActive = code === activeLocale;
          const isFilled = hasContent(draft?.localized?.[code]);
          return (
            <button
              key={code}
              type="button"
              className={isActive ? 'btn-primary' : 'btn-secondary'}
              aria-pressed={isActive}
              onClick={() => setActiveLocale(code)}
              style={{ padding: '4px 12px', fontSize: '13px' }}
              title={isFilled ? t('adminConsole.pricingContentLocaleFilled') : undefined}
            >
              {LOCALE_META[code]?.name || code}
              {isFilled ? ' ✓' : ''}
            </button>
          );
        })}
      </div>

      {!filled ? <p className="session-meta" style={{ marginTop: 0 }}>{t('adminConsole.pricingContentEmptyLocale')}</p> : null}

      <div dir={LOCALE_META[activeLocale]?.dir || 'ltr'} style={{ display: 'grid', gap: '8px' }}>
        <label htmlFor={inputId('name')}>
          {t(FIELD_LABEL_KEYS.name)}
          <input id={inputId('name')} value={fields.name || ''} placeholder={draft?.name || ''} onChange={(e) => updateField('name', e.target.value)} />
        </label>
        <label htmlFor={inputId('description')}>
          {t(FIELD_LABEL_KEYS.description)}
          <textarea id={inputId('description')} rows={2} value={fields.description || ''} placeholder={draft?.description || ''} onChange={(e) => updateField('description', e.target.value)} />
        </label>
        <label htmlFor={inputId('features')}>
          {t('adminConsole.pricingContentFeatures')}
          <textarea id={inputId('features')} rows={5} value={fields.features || ''} onChange={(e) => updateField('features', e.target.value)} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
          {SHORT_TEXT_FIELDS.map((field) => (
            <label key={field} htmlFor={inputId(field)}>
              {t(FIELD_LABEL_KEYS[field])}
              <input
                id={inputId(field)}
                value={fields[field] || ''}
                placeholder={field === 'cta_label' ? (draft?.cta_label || '') : ''}
                onChange={(e) => updateField(field, e.target.value)}
              />
            </label>
          ))}
        </div>
        <p className="session-meta" style={{ margin: '4px 0 0' }}>{t('adminConsole.pricingContentPriceHint', { price: computedPrice })}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
          {PRICE_FIELDS.map((field) => (
            <label key={field} htmlFor={inputId(field)}>
              {t(FIELD_LABEL_KEYS[field])}
              <input id={inputId(field)} value={fields[field] || ''} onChange={(e) => updateField(field, e.target.value)} />
            </label>
          ))}
        </div>
      </div>
    </fieldset>
  );
}
