'use client';

import { useEffect, useState } from 'react';
import AppNav from '@/components/AppNav';
import useI18n from '@/lib/i18n/useI18n';
import {
  createLinkedInDraft,
  deleteLinkedInDraft,
  getLinkedInDrafts,
  updateLinkedInDraft,
} from '@/lib/admin-linkedin';
import './linkedin.css';

const MAX_CONTENT_LENGTH = 3000;
const EMPTY_DRAFT = { title: '', content: '' };

function formatDate(value, isEn) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(isEn ? 'en-US' : 'fr-FR');
}

export default function LinkedInAdminClient() {
  const { locale, withLocalePath } = useI18n();
  const isEn = locale === 'en';
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
      setError(err.message || (isEn ? 'Unable to load drafts.' : 'Impossible de charger les brouillons.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('currentUser');
      setSessionUser(raw ? JSON.parse(raw) : null);
    } catch {
      setSessionUser(null);
    }
    refreshDrafts();
  }, []);

  function logout() {
    localStorage.removeItem('jwt');
    sessionStorage.removeItem('jwt');
    sessionStorage.removeItem('currentUser');
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
        setNotice(isEn ? 'Draft updated.' : 'Brouillon mis à jour.');
      } else {
        await createLinkedInDraft(payload);
        setNotice(isEn ? 'Draft saved.' : 'Brouillon enregistré.');
      }
      resetForm();
      await refreshDrafts();
    } catch (err) {
      setError(err.message || (isEn ? 'Unable to save the draft.' : 'Impossible d’enregistrer le brouillon.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm(isEn ? 'Delete this draft?' : 'Supprimer ce brouillon ?');
    if (!confirmed) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await deleteLinkedInDraft(id);
      if (editingId === id) resetForm();
      setNotice(isEn ? 'Draft deleted.' : 'Brouillon supprimé.');
      await refreshDrafts();
    } catch (err) {
      setError(err.message || (isEn ? 'Unable to delete the draft.' : 'Impossible de supprimer le brouillon.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy(content) {
    setError('');
    setNotice('');
    try {
      await navigator.clipboard.writeText(content);
      setNotice(isEn ? 'Post text copied.' : 'Texte du post copié.');
    } catch {
      setError(isEn ? 'Clipboard access is unavailable in this browser.' : 'La copie n’est pas disponible dans ce navigateur.');
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
    || (isEn ? 'Administrator' : 'Administrateur');

  return (
    <>
      <AppNav userLabel={userLabel} onLogout={logout} role="admin" />
      <main className="linkedin-admin-shell">
        <header className="linkedin-admin-header">
          <div>
            <p className="linkedin-admin-eyebrow">{isEn ? 'ADMIN CONTENT' : 'CONTENU ADMIN'}</p>
            <h1>{isEn ? 'LinkedIn drafts' : 'Publications LinkedIn'}</h1>
            <p>{isEn ? 'Write, preview and save posts before publishing them manually.' : 'Rédige, prévisualise et enregistre tes posts avant de les publier manuellement.'}</p>
          </div>
          <a className="linkedin-admin-back" href={withLocalePath('/admin')}>{isEn ? 'Admin console' : 'Console admin'}</a>
        </header>

        {error ? <div className="linkedin-admin-alert linkedin-admin-alert--error" role="alert">{error}</div> : null}
        {notice ? <div className="linkedin-admin-alert linkedin-admin-alert--success" role="status">{notice}</div> : null}

        <div className="linkedin-admin-grid">
          <section className="linkedin-admin-card">
            <h2>{editingId ? (isEn ? 'Edit draft' : 'Modifier le brouillon') : (isEn ? 'Create a post' : 'Créer un post')}</h2>
            <form onSubmit={handleSubmit} className="linkedin-admin-form">
              <label>
                {isEn ? 'Internal title (optional)' : 'Titre interne (facultatif)'}
                <input
                  value={draft.title}
                  maxLength={120}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder={isEn ? 'e.g. Team-building tips' : 'Ex. Conseils de team building'}
                />
              </label>
              <label>
                {isEn ? 'Post text' : 'Texte de la publication'}
                <textarea
                  value={draft.content}
                  maxLength={MAX_CONTENT_LENGTH}
                  rows={12}
                  required
                  onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
                  placeholder={isEn ? 'Write your LinkedIn post here...' : 'Rédige ici le texte de ta publication LinkedIn...'}
                />
              </label>
              <div className="linkedin-admin-form-footer">
                <span>{draft.content.length}/{MAX_CONTENT_LENGTH}</span>
                <div>
                  {editingId ? <button type="button" className="linkedin-admin-secondary" onClick={resetForm}>{isEn ? 'Cancel' : 'Annuler'}</button> : null}
                  <button type="submit" className="linkedin-admin-primary" disabled={busy || !draft.content.trim()}>
                    {busy ? (isEn ? 'Saving...' : 'Enregistrement...') : (editingId ? (isEn ? 'Save changes' : 'Enregistrer') : (isEn ? 'Save draft' : 'Enregistrer le brouillon'))}
                  </button>
                </div>
              </div>
            </form>
          </section>

          <section className="linkedin-admin-card">
            <h2>{isEn ? 'Preview' : 'Aperçu'}</h2>
            <article className="linkedin-preview">
              <div className="linkedin-preview-avatar" aria-hidden="true">T</div>
              <div className="linkedin-preview-main">
                <strong>TeamBlender</strong>
                <span>{isEn ? 'Team-building experiences for teams' : 'Expériences de team building pour les équipes'}</span>
                <span>{isEn ? 'Preview · visible only to admins' : 'Aperçu · visible uniquement par les admins'}</span>
                <p>{draft.content || (isEn ? 'Your post preview will appear here.' : 'L’aperçu de ton post apparaîtra ici.')}</p>
              </div>
            </article>
            <p className="linkedin-admin-note">{isEn ? 'This MVP saves drafts only. It does not connect to or publish on LinkedIn.' : 'Ce MVP enregistre uniquement des brouillons. Il ne se connecte pas à LinkedIn et ne publie rien automatiquement.'}</p>
          </section>
        </div>

        <section className="linkedin-admin-card linkedin-drafts-card">
          <div className="linkedin-drafts-heading">
            <h2>{isEn ? 'Saved drafts' : 'Brouillons enregistrés'}</h2>
            <span>{drafts.length}</span>
          </div>
          {loading ? <p>{isEn ? 'Loading...' : 'Chargement...'}</p> : drafts.length === 0 ? (
            <p className="linkedin-admin-empty">{isEn ? 'No saved drafts yet.' : 'Aucun brouillon enregistré pour le moment.'}</p>
          ) : (
            <ul className="linkedin-drafts-list">
              {drafts.map((item) => (
                <li key={item.id} className="linkedin-draft-item">
                  <div className="linkedin-draft-copy">
                    <strong>{item.title || (isEn ? 'Untitled post' : 'Publication sans titre')}</strong>
                    <span>{formatDate(item.updated_at, isEn)}</span>
                    <p>{item.content}</p>
                  </div>
                  <div className="linkedin-draft-actions">
                    <button type="button" className="linkedin-admin-secondary" onClick={() => handleEdit(item)}>{isEn ? 'Edit' : 'Modifier'}</button>
                    <button type="button" className="linkedin-admin-secondary" onClick={() => handleCopy(item.content)}>{isEn ? 'Copy' : 'Copier'}</button>
                    <button type="button" className="linkedin-admin-danger" disabled={busy} onClick={() => handleDelete(item.id)}>{isEn ? 'Delete' : 'Supprimer'}</button>
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
