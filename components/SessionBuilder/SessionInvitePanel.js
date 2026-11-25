"use client";

import {
  Check,
  Copy,
  Link2,
  Mail,
} from 'lucide-react';

// Code et lien d’invitation de la session : rendu seul, état et actions restent dans SessionBuilder.
export default function SessionInvitePanel({
  handleCopyInviteValue,
  inviteCopyState,
  inviteLink,
  inviteMessage,
  sessionInvite,
  t,
}) {
  return (
    <section className="min-w-0" aria-label={t('sessionBuilder.inviteTitle')}>
      <h2 className="mb-3 text-sm font-bold text-[var(--ink)]">{t('sessionBuilder.inviteEyebrow')}</h2>
      <div className="flex flex-col items-center rounded-2xl bg-[var(--surface-panel-soft)] px-4 py-4 text-center">
        <span className="text-xs font-semibold text-[var(--ink-soft)]">{t('sessionBuilder.inviteCodeLabel')}</span>
        <strong dir="ltr" className="my-2 max-w-full select-text break-all font-mono text-3xl font-bold text-[var(--ink)] sm:text-4xl">
          {String(sessionInvite?.code || '').trim() || '...'}
        </strong>
        <button
          type="button"
          className="inline-flex min-h-9 max-w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--card)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => handleCopyInviteValue(sessionInvite?.code, 'code')}
          disabled={!String(sessionInvite?.code || '').trim()}
        >
          {inviteCopyState === 'code' ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          {inviteCopyState === 'code'
            ? t('sessionBuilder.inviteCopied')
            : t('sessionBuilder.copyInviteCode')}
        </button>
      </div>
      <div className="mt-3 flex justify-center">
        <button
          type="button"
          className="inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-strong)] px-5 py-3 text-center text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => handleCopyInviteValue(inviteMessage, 'invite')}
          disabled={!inviteMessage}
        >
          {inviteCopyState === 'invite' ? <Check size={17} aria-hidden="true" /> : <Mail size={17} aria-hidden="true" />}
          {inviteCopyState === 'invite'
            ? t('sessionBuilder.inviteCopied')
            : t('sessionBuilder.copyInvite')}
        </button>
      </div>
      <div className="mt-4 flex min-w-0 items-center gap-2 text-sm text-[var(--ink-soft)]">
        <Link2 size={16} className="shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <span className="block text-xs font-semibold">{t('sessionBuilder.inviteLinkLabel')}</span>
          {inviteLink ? (
            <a className="block truncate hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-strong)]" href={inviteLink} target="_blank" rel="noopener noreferrer" dir="ltr">
              {inviteLink}
            </a>
          ) : <span>...</span>}
        </div>
        <button
          type="button"
          className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold transition-colors hover:bg-[var(--surface-panel-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => handleCopyInviteValue(inviteLink, 'link')}
          disabled={!inviteLink}
        >
          {inviteCopyState === 'link' ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          <span>
            {inviteCopyState === 'link'
              ? t('sessionBuilder.inviteCopied')
              : t('sessionBuilder.copyInviteLink')}
          </span>
        </button>
      </div>
    </section>
  );
}
