"use client";

export default function TrustedCompanyLogo({ company }) {
  const mark = String(company?.mark || '').toUpperCase();
  const name = String(company?.name || '').trim().toLowerCase();

  switch (name || mark) {
    case 'novacore':
    case 'NV':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <path d="M3.8 18.8 11.9 4.9l8.3 13.9h-3.3l-1.6-2.9H8.8l-1.6 2.9z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M10.3 13.4h3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'asterion':
    case 'AR':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <path d="M6.2 6.2h7.2a5.6 5.6 0 0 1 0 11.2H6.2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M10.1 9.7h6.2M10.1 14.3h6.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'lumaris':
    case 'LM':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <circle cx="9" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="15.2" cy="14.8" r="3.9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M6.2 15.1c1.3 1.8 3.4 2.8 5.8 2.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'oravia':
    case 'OR':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <rect x="5.2" y="5.2" width="13.6" height="13.6" rx="2.8" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8.9 12h6.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="11" cy="8.9" r="1.1" fill="currentColor" opacity="0.8" />
        </svg>
      );
    case 'synora':
    case 'SY':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <path d="M9.4 6.6c1.7 0 3 1.4 3 3 0 2.2-3 4.8-3 4.8s-3-2.6-3-4.8c0-1.6 1.3-3 3-3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M16.2 9.2c1.2 0 2.2 1 2.2 2.2 0 1.5-2.2 3.4-2.2 3.4s-2.2-1.9-2.2-3.4c0-1.2 1-2.2 2.2-2.2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case 'bluehive':
    case 'BL':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <rect x="5.2" y="6" width="13.6" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9.2 12h5.6M12 9.2v5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.8" opacity="0.9" />
          <path d="M8.2 8.4h7.2M8.2 12h4.8M8.2 15.6h5.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
  }
}
