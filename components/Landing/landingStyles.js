// Shared Tailwind utility-class constants for landing page visuals, kept out of
// app/page.js so section components own their own presentation, not the parent.
export const GLASS_CARD_CLASS = 'rounded-3xl border border-[color:var(--surface-soft-border)] bg-[color:var(--surface-panel)] shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:shadow-xl';

export const PILL_CLASS = 'inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-all duration-200 ease-in-out';

export const CHIP_CLASS = 'inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-soft-border)] bg-[color:var(--surface-panel)] px-4 py-2 text-sm font-medium text-[color:var(--ink-soft)] shadow-sm backdrop-blur-md transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-[color:var(--surface-soft-border-strong)] hover:bg-[color:var(--surface-panel-soft)] hover:shadow-md';
