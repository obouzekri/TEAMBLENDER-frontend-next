'use client';

import { useEffect, useState } from 'react';
import AppNav from '@/components/AppNav';
import { clearSessionAuth, getStoredCurrentUser } from '@/lib/auth';
import useI18n from '@/lib/i18n/useI18n';
import { formatDate as formatLocaleDate, NUMERIC_DATE_TIME } from '@/lib/i18n/format';
import {
  createLinkedInDraft,
  deleteLinkedInDraft,
  getLinkedInDrafts,
  updateLinkedInDraft,
} from '@/lib/admin-linkedin';
import './linkedin.css';

const MAX_CONTENT_LENGTH = 3000;
const EMPTY_DRAFT = { title: '', content: '' };

function formatDate(value, locale) {
  return formatLocaleDate(value, locale, NUMERIC_DATE_TIME) || '';
}

export default function LinkedInAdminClient() {
  const { locale, withLocalePath, t } = useI18n();
  const [sessionUser, setSessionUser] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function refreshDrafts() {
    setLoading(true);
    setError('');
    try {
      const result = await getLinkedInDrafts();
      setDrafts(Array.isArray(result?.items) ? result.items : []);
    } catch (err) {
      setError(err.message || t('adminLinkedIn.unableToLoadDrafts'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setSessionUser(getStoredCurrentUser());
    refreshDrafts();
  }, []);

  function logout() {
    clearSessionAuth();
    window.location.replace(withLocalePath('/login'));
  }

  function resetForm() {
    setDraft(EMPTY_DRAFT);
    setEditingId('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const payload = { title: draft.title.trim(), content: draft.content.trim() };
      if (editingId) {
        await updateLinkedInDraft(editingId, payload);
        setNotice(t('adminLinkedIn.draftUpdated'));
      } else {
        await createLinkedInDraft(payload);
        setNotice(t('adminLinkedIn.draftSaved'));
      }
      resetForm();
      await refreshDrafts();
    } catch (err) {
      setError(err.message || t('adminLinkedIn.unableToSaveTheDraft'));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm(t('adminLinkedIn.deleteThisDraft'));
    if (!confirmed) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await deleteLinkedInDraft(id);
      if (editingId === id) resetForm();
      setNotice(t('adminLinkedIn.draftDeleted'));
      await refreshDrafts();
    } catch (err) {
      setError(err.message || t('adminLinkedIn.unableToDeleteTheDraft'));
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy(content) {
    setError('');
    setNotice('');
    try {
      await navigator.clipboard.writeText(content);
      setNotice(t('adminLinkedIn.postTextCopied'));
    } catch {
      setError(t('adminLinkedIn.clipboardAccessIsUnavailableInThis'));
    }
  }

  function handleEdit(item) {
    setEditingId(item.id);
    setDraft({ title: item.title || '', content: item.content || '' });
    setNotice('');
    setError('');
  }

  const userLabel = [sessionUser?.first_name, sessionUser?.last_name].filter(Boolean).join(' ')
    || sessionUser?.email
    || t('adminLinkedIn.administrator');

  return (
    <>
      <AppNav userLabel={userLabel} onLogout={logout} role="admin" />
      <main className="linkedin-admin-shell">
        <header className="linkedin-admin-header">
          <div>
            <p className="linkedin-admin-eyebrow">{t('adminLinkedIn.adminContent')}</p>
            <h1>{t('adminLinkedIn.linkedinDrafts')}</h1>
            <p>{t('adminLinkedIn.writePreviewAndSavePostsBefore')}</p>
          </div>
          <a className="linkedin-admin-back" href={withLocalePath('/admin')}>{t('adminLinkedIn.adminConsole')}</a>
        </header>

        {error ? <div className="linkedin-admin-alert linkedin-admin-alert--error" role="alert">{error}</div> : null}
        {notice ? <div className="linkedin-admin-alert linkedin-admin-alert--success" role="status">{notice}</div> : null}

        <div className="linkedin-admin-grid">
          <section className="linkedin-admin-card">
            <h2>{editingId ? t('adminLinkedIn.editDraft') : t('adminLinkedIn.createAPost')}</h2>
            <form onSubmit={handleSubmit} className="linkedin-admin-form">
              <label>
                {t('adminLinkedIn.internalTitleOptional')}
                <input
                  value={draft.title}
                  maxLength={120}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder={t('adminLinkedIn.eGTeamBuildingTips')}
                />
              </label>
              <label>
                {t('adminLinkedIn.postText')}
                <textarea
                  value={draft.content}
                  maxLength={MAX_CONTENT_LENGTH}
                  rows={12}
                  required
                  onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
                  placeholder={t('adminLinkedIn.writeYourLinkedinPostHere')}
                />
              </label>
              <div className="linkedin-admin-form-footer">
                <span>{draft.content.length}/{MAX_CONTENT_LENGTH}</span>
                <div>
                  {editingId ? <button type="button" className="linkedin-admin-secondary" onClick={resetForm}>{t('adminLinkedIn.cancel')}</button> : null}
                  <button type="submit" className="linkedin-admin-primary" disabled={busy || !draft.content.trim()}>
                    {busy ? t('adminLinkedIn.saving') : (editingId ? t('adminLinkedIn.saveChanges') : t('adminLinkedIn.saveDraft'))}
                  </button>
                </div>
              </div>
            </form>
          </section>

          <section className="linkedin-admin-card">
            <h2>{t('adminLinkedIn.preview')}</h2>
            <article className="linkedin-preview">
              <div className="linkedin-preview-avatar" aria-hidden="true">T</div>
              <div className="linkedin-preview-main">
                <strong>TeamBlender</strong>
                <span>{t('adminLinkedIn.teamBuildingExperiencesForTeams')}</span>
                <span>{t('adminLinkedIn.previewVisibleOnlyToAdmins')}</span>
                <p>{draft.content || t('adminLinkedIn.yourPostPreviewWillAppearHere')}</p>
              </div>
            </article>
            <p className="linkedin-admin-note">{t('adminLinkedIn.thisMvpSavesDraftsOnlyIt')}</p>
          </section>
        </div>

        <section className="linkedin-admin-card linkedin-drafts-card">
          <div className="linkedin-drafts-heading">
            <h2>{t('adminLinkedIn.savedDrafts')}</h2>
            <span>{drafts.length}</span>
          </div>
          {loading ? <p>{t('adminLinkedIn.loading')}</p> : drafts.length === 0 ? (
            <p className="linkedin-admin-empty">{t('adminLinkedIn.noSavedDraftsYet')}</p>
          ) : (
            <ul className="linkedin-drafts-list">
              {drafts.map((item) => (
                <li key={item.id} className="linkedin-draft-item">
                  <div className="linkedin-draft-copy">
                    <strong>{item.title || t('adminLinkedIn.untitledPost')}</strong>
                    <span>{formatDate(item.updated_at, locale)}</span>
                    <p>{item.content}</p>
                  </div>
                  <div className="linkedin-draft-actions">
                    <button type="button" className="linkedin-admin-secondary" onClick={() => handleEdit(item)}>{t('adminLinkedIn.edit')}</button>
                    <button type="button" className="linkedin-admin-secondary" onClick={() => handleCopy(item.content)}>{t('adminLinkedIn.copy')}</button>
                    <button type="button" className="linkedin-admin-danger" disabled={busy} onClick={() => handleDelete(item.id)}>{t('adminLinkedIn.delete')}</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
