'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import useI18n from '@/lib/i18n/useI18n';
import { pickLocalized } from '@/lib/i18n';
import { formatNumber } from '@/lib/i18n/format';
import { PLAN_LIMIT_EVENT } from '@/lib/plan-limit';
import { trackPosthogEvent } from '@/lib/analytics';
import styles from './PlanLimitDialog.module.css';

const PRICING_PATH = '/pricing';

// Modale globale « limite de l'offre atteinte » : écoute les événements émis par
// notifyPlanLimit() (lib/plan-limit.js) et invite le manager à changer d'offre.
export default function PlanLimitDialog() {
  const { locale, t, withLocalePath } = useI18n();
  const router = useRouter();
  const [info, setInfo] = useState(null);

  useEffect(() => {
    const handle = (event) => {
      const detail = event?.detail || null;
      if (!detail) return;
      setInfo(detail);
      try {
        trackPosthogEvent('plan_limit_reached_shown', {
          metric: detail.metric,
          limit: detail.limit,
          plan_code: detail.planCode,
        });
      } catch {
        // Le suivi ne doit jamais bloquer l'affichage.
      }
    };
    window.addEventListener(PLAN_LIMIT_EVENT, handle);
    return () => window.removeEventListener(PLAN_LIMIT_EVENT, handle);
  }, []);

  const close = useCallback(() => setInfo(null), []);

  const goTo = useCallback((path, target) => {
    try {
      trackPosthogEvent('plan_limit_upgrade_clicked', { metric: info?.metric, target });
    } catch {
      // ignore
    }
    setInfo(null);
    router.push(withLocalePath(path));
  }, [info, router, withLocalePath]);

  if (!info) return null;

  const metricKey = info.metric === 'sessions'
    ? (info.scope === 'total' ? 'sessionsTotal' : 'sessionsMonth')
    : info.metric === 'participants'
      ? 'participants'
      : 'generic';
  const localizedPlanName = pickLocalized(info.planLocalizedContent, locale)?.name || info.planName;
  const hasLimit = info.limit != null;
  const params = {
    limit: hasLimit ? formatNumber(info.limit, locale) : '',
    current: info.current != null ? formatNumber(info.current, locale) : '',
    plan: localizedPlanName || t('shell.planLimitYourPlan'),
  };
  const title = t(`shell.planLimitTitle_${metricKey}`);
  const body = hasLimit
    ? t(`shell.planLimitBody_${metricKey}`, params)
    : t('shell.planLimitBody_generic', params);
  const usagePercent = hasLimit && info.limit > 0 && info.current != null
    ? Math.min(100, Math.round((info.current / info.limit) * 100))
    : null;

  return (
    <Modal open title={title} onClose={close} dialogClassName={styles.dialog}>
      <div className={styles.body} data-testid="plan-limit-dialog" data-metric={info.metric}>
        <p className={styles.eyebrow}>{t('shell.planLimitEyebrow')}</p>
        <p className={styles.message}>{body}</p>

        {usagePercent != null ? (
          <div className={styles.usage}>
            <div className={styles.usageLabel}>
              <span>{t(`shell.planLimitUsage_${info.metric === 'sessions' ? 'sessions' : 'participants'}`)}</span>
              <strong>{t('shell.planLimitUsageValue', params)}</strong>
            </div>
            <div
              className={styles.usageTrack}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={info.limit}
              aria-valuenow={Math.min(info.current, info.limit)}
              aria-label={t(`shell.planLimitUsage_${info.metric === 'sessions' ? 'sessions' : 'participants'}`)}
            >
              <span className={styles.usageFill} style={{ width: `${usagePercent}%` }} />
            </div>
          </div>
        ) : null}

        <p className={styles.hint}>{t(`shell.planLimitUpgradeHint_${info.metric === 'sessions' ? 'sessions' : 'participants'}`)}</p>

        <div className={styles.actions}>
          <Button variant="ghost" onClick={close}>{t('shell.planLimitLater')}</Button>
          <Button variant="secondary" onClick={() => goTo(PRICING_PATH, 'pricing')}>
            {t('shell.planLimitComparePlans')}
          </Button>
          <Button variant="primary" onClick={() => goTo(info.upgradePath || '/contact?plan=team', 'contact')} autoFocus>
            {t('shell.planLimitUpgrade')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
