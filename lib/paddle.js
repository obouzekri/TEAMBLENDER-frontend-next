import { getApiUrl } from './config';

const PADDLE_SDK_URL = 'https://cdn.paddle.com/paddle/v2/paddle.js';

let paddleScriptPromise = null;

function loadPaddleScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Paddle est disponible uniquement cote navigateur.'));
  }

  if (window.Paddle) {
    return Promise.resolve(window.Paddle);
  }

  if (paddleScriptPromise) {
    return paddleScriptPromise;
  }

  paddleScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PADDLE_SDK_URL;
    script.async = true;
    script.onload = () => {
      if (window.Paddle) resolve(window.Paddle);
      else reject(new Error('Paddle SDK charge mais indisponible.'));
    };
    script.onerror = () => reject(new Error('Impossible de charger le SDK Paddle.'));
    document.head.appendChild(script);
  });

  return paddleScriptPromise;
}

async function initPaddleCheckoutRequest({ pricing_plan_id, billing_cycle, paddle_price_id }) {
  const token = typeof window !== 'undefined'
    ? (window.localStorage.getItem('jwt') || window.sessionStorage.getItem('jwt') || '')
    : '';

  if (!token) {
    throw new Error('AUTH_REQUIRED');
  }

  const response = await fetch(getApiUrl('/billing/paddle/init'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pricing_plan_id, billing_cycle, paddle_price_id }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(payload?.error || 'Initialisation Paddle impossible.');
    err.code = payload?.code || 'PADDLE_INIT_FAILED';
    err.payload = payload;
    throw err;
  }

  return payload;
}

/**
 * Open Paddle Checkout overlay.
 * `onComplete` can refresh account state or redirect after successful payment.
 */
export async function startPaddleCheckout({
  pricing_plan_id,
  billing_cycle = 'monthly',
  paddle_price_id,
  customer_email,
  onComplete,
}) {
  const init = await initPaddleCheckoutRequest({ pricing_plan_id, billing_cycle, paddle_price_id });
  const Paddle = await loadPaddleScript();

  const environment = String(init?.environment || 'sandbox').toLowerCase();
  const clientToken = String(init?.client_token || '').trim();
  const priceId = String(init?.price_id || '').trim();
  const invoiceReference = String(init?.invoice_reference || '').trim();
  const email = String(customer_email || init?.customer_email || '').trim();

  if (!clientToken || !priceId || !invoiceReference) {
    throw new Error('Configuration Paddle incomplete (token / price_id / invoice_reference).');
  }

  Paddle.Environment.set(environment === 'production' ? 'production' : 'sandbox');
  Paddle.Initialize({
    token: clientToken,
    eventCallback: (event) => {
      if (event?.name === 'checkout.completed' && typeof onComplete === 'function') {
        onComplete(event);
      }
    },
  });

  Paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: email ? { email } : undefined,
    customData: {
      invoice_reference: invoiceReference,
      pricing_plan_id: String(pricing_plan_id || ''),
      billing_cycle: String(billing_cycle || 'monthly'),
    },
    settings: {
      displayMode: 'overlay',
      theme: 'light',
      locale: 'fr',
    },
  });

  return init;
}
