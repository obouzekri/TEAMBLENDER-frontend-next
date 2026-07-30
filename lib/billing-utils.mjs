export function getCheckoutRedirectUrl(response) {
  const topLevelUrl = String(response?.url || '').trim();
  if (topLevelUrl) {
    return topLevelUrl;
  }

  const paymentCheckoutUrl = String(response?.payment?.checkout_url || '').trim();
  if (paymentCheckoutUrl) {
    return paymentCheckoutUrl;
  }

  return '';
}
