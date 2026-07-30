import test from 'node:test';
import assert from 'node:assert/strict';
import { getCheckoutRedirectUrl } from './billing-utils.mjs';

test('extracts a direct checkout URL from a backend response', () => {
  const response = {
    url: 'https://payoneer.example/checkout/session-123',
    payment: {
      provider: 'payoneer',
      checkout_url: 'https://payoneer.example/checkout/session-456',
    },
  };

  assert.equal(getCheckoutRedirectUrl(response), 'https://payoneer.example/checkout/session-123');
});

test('falls back to payment.checkout_url when no top-level URL is present', () => {
  const response = {
    payment: {
      provider: 'payoneer',
      checkout_url: 'https://payoneer.example/checkout/session-456',
    },
  };

  assert.equal(getCheckoutRedirectUrl(response), 'https://payoneer.example/checkout/session-456');
});
