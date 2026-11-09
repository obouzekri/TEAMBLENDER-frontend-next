'use client';

import { Download, ReceiptText } from 'lucide-react';

export default function AccountInvoicesPanel({
  active,
  planHistory,
  locale,
  t,
  plans,
  dhPriceByPlanId,
  formatDate,
  resolveHistoryAmountLabel,
  onDownloadInvoice,
}) {
  return (
    <section
      id="account-invoices"
      role="tabpanel"
      aria-labelledby="account-tab-invoices"
      tabIndex={0}
      className={`account-saas-card account-panel ${active ? 'is-active' : ''}`}
      hidden={!active}
    >
      <header className="account-saas-card__header">
        <h2 className="account-saas-card__title">{t('account.invoicesTitle')}</h2>
        <p className="account-saas-card__subtitle">{t('account.invoicesDescription')}</p>
      </header>
      <div className="account-saas-card__body">
        {planHistory.length > 0 ? (
          <div className="account-history-table-wrap">
            <table className="account-history-table">
              <caption className="sr-only">{t('account.billingHistory')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('account.invoiceDate')}</th>
                  <th scope="col">{t('account.invoicePlan')}</th>
                  <th scope="col">{t('account.invoiceAmount')}</th>
                  <th scope="col">{t('account.status')}</th>
                  <th scope="col">{t('account.invoiceDocument')}</th>
                </tr>
              </thead>
              <tbody>
                {planHistory.map((entry) => (
                  <tr key={String(entry.id)}>
                    <td>{formatDate(entry.at, locale)}</td>
                    <td>{entry.to}</td>
                    <td>{resolveHistoryAmountLabel(entry, plans, dhPriceByPlanId)}</td>
                    <td><span className="account-history-status account-history-status--paid">{t('account.paid')}</span></td>
                    <td>
                      <button type="button" className="account-history-link" onClick={() => onDownloadInvoice(entry)}>
                        <Download size={15} aria-hidden="true" /> {t('account.downloadPdf')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="account-invoices-empty">
            <ReceiptText size={32} aria-hidden="true" />
            <h3>{t('account.noInvoices')}</h3>
            <p>{t('account.noInvoicesDescription')}</p>
          </div>
        )}
      </div>
    </section>
  );
}