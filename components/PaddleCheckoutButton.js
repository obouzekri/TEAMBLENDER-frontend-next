'use client';

import { useState } from 'react';
import { startPaddleCheckout } from '@/lib/paddle';
import useI18n from '@/lib/i18n/useI18n';

/**
 * Reusable Paddle Checkout button.
 * Works on both landing / pricing page and inside the authenticated dashboard.
 *
 * Props:
 *  - pricingPlanId  {string|number}  required — the plan id to pass to the backend
 *  - billingCycle   {'monthly'|'annual'}  default 'monthly'
 *  - customerEmail  {string}         optional — pre-fill the checkout email
 *  - onSuccess      {function}       called with the paddle event when checkout.completed
 *  - className      {string}         extra CSS classes on the button
 *  - disabled       {boolean}
 */
export default function PaddleCheckoutButton({
  pricingPlanId,
  billingCycle = 'monthly',
  customerEmail = '',
  onSuccess,
  className = 'btn-primary',
  disabled = false,
}) {
  const { locale, withLocalePath } = useI18n();
  const isEn = locale === 'en';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    if (loading || disabled) return;
    setError('');
    setLoading(true);

    try {
      await startPaddleCheckout({
        pricing_plan_id: pricingPlanId,
        billing_cycle: billingCycle,
        customer_email: customerEmail,
        onComplete: (event) => {
          if (typeof onSuccess === 'function') {
            onSuccess(event);
          } else {
            // Default: redirect to account with success flag
            const target = typeof withLocalePath === 'function'
              ? withLocalePath('/account?billing=paddle_success')
              : '/account?billing=paddle_success';
            window.location.assign(target);
          }
        },
      });
    } catch (err) {
      if (err.message === 'AUTH_REQUIRED' || err.code === 'AUTH_REQUIRED') {
        // Not logged in — redirect to login then back
        const next = typeof withLocalePath === 'function'
          ? withLocalePath('/pricing')
          : '/pricing';
        window.location.assign(
          `${typeof withLocalePath === 'function' ? withLocalePath('/login') : '/login'}?next=${encodeURIComponent(next)}`
        );
        return;
      }
      setError(err.message || (isEn ? 'Payment temporarily unavailable.' : 'Paiement temporairement indisponible.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="paddle-checkout-btn-wrap">
      <button
        type="button"
        className={className}
        onClick={handleClick}
        disabled={loading || disabled}
        aria-busy={loading}
      >
        {loading
          ? (isEn ? 'Opening checkout…' : 'Ouverture du paiement…')
          : (isEn ? 'Pay now' : 'Payer maintenant')}
      </button>
      <span className="paddle-checkout-secure-label" aria-hidden="true">
        🔒 {isEn ? 'Secure payment' : 'Paiement sécurisé'}
      </span>
      {error ? (
        <p className="paddle-checkout-error form-error" role="alert">{error}</p>
      ) : null}
    </div>
  );
}
