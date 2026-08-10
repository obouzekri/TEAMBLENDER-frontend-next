"use client";

import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { getAvatarLibrary } from '@/lib/avatar-profile';

export default function AvatarPickerModal({
  open,
  user,
  currentSelection,
  onClose,
  onSave,
}) {
  const avatars = useMemo(() => getAvatarLibrary(), []);
  const [mode, setMode] = useState('illustrated');
  const [avatarId, setAvatarId] = useState(avatars[0]?.id || 'avatar-01');

  useEffect(() => {
    if (!open) return;
    const nextMode = String(currentSelection?.mode || 'illustrated') === 'photo' ? 'photo' : 'illustrated';
    const nextAvatarId = String(currentSelection?.avatarId || avatars[0]?.id || 'avatar-01');
    setMode(nextMode);
    setAvatarId(nextAvatarId);
  }, [open, currentSelection?.mode, currentSelection?.avatarId, avatars]);

  const userEmail = String(user?.email || '').trim();
  const canUsePhoto = Boolean(String(user?.picture_url || '').trim());
  const activeSelectionText = mode === 'photo'
    ? 'Photo / initials selected'
    : `Illustrated avatar selected: ${avatarId}`;

  return (
    <Modal
      open={open}
      title="Choose your Avatar"
      onClose={onClose}
      bodyClassName="avatar-picker-modal-body"
    >
      <div className="avatar-picker-modal" aria-live="polite">
        <p className="avatar-picker-live-status" role="status">{activeSelectionText}</p>

        <section className="avatar-picker-option" role="radiogroup" aria-label="Avatar source">
          <button
            type="button"
            className={`avatar-picker-radio ${mode === 'photo' ? 'is-active' : ''}`}
            onClick={() => setMode('photo')}
            role="radio"
            aria-checked={mode === 'photo'}
          >
            <span className="avatar-picker-radio__bullet" aria-hidden="true" />
            <span>
              <strong>Use my photo / initials</strong>
              <small>{canUsePhoto ? 'Use your current photo when available.' : 'No external photo available, initials will be used.'}</small>
            </span>
          </button>
          {userEmail ? <p className="avatar-picker-email">{userEmail}</p> : null}
        </section>

        <section className="avatar-picker-option" role="radiogroup" aria-label="Avatar gallery">
          <button
            type="button"
            className={`avatar-picker-radio ${mode === 'illustrated' ? 'is-active' : ''}`}
            onClick={() => setMode('illustrated')}
            role="radio"
            aria-checked={mode === 'illustrated'}
          >
            <span className="avatar-picker-radio__bullet" aria-hidden="true" />
            <span>
              <strong>Avatar Gallery</strong>
              <small>Select one professional illustrated avatar.</small>
            </span>
          </button>

          <div className="avatar-picker-grid" aria-label="Illustrated avatars">
            {avatars.map((avatar) => (
              <button
                key={avatar.id}
                type="button"
                className={`avatar-picker-item ${avatarId === avatar.id ? 'is-selected' : ''}`}
                onClick={() => {
                  setMode('illustrated');
                  setAvatarId(avatar.id);
                }}
                aria-label={avatar.label}
                aria-pressed={avatarId === avatar.id}
              >
                <img src={avatar.src} alt={avatar.label} />
              </button>
            ))}
          </div>
        </section>

        <div className="avatar-picker-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onSave?.({ mode, avatarId })}
          >
            Save
          </button>
        </div>
      </div>

      <style jsx global>{`
        .avatar-picker-modal-body {
          padding-top: 0.45rem;
        }

        .avatar-picker-modal {
          display: grid;
          gap: 1rem;
        }

        .avatar-picker-live-status {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip: rect(0 0 0 0);
          clip-path: inset(50%);
          white-space: nowrap;
          border: 0;
          padding: 0;
          margin: -1px;
        }

        .avatar-picker-option {
          display: grid;
          gap: 0.55rem;
          border: 1px solid #e6edf8;
          border-radius: 14px;
          background: #ffffff;
          padding: 0.8rem;
        }

        .avatar-picker-radio {
          display: flex;
          align-items: flex-start;
          gap: 0.7rem;
          width: 100%;
          border: none;
          background: transparent;
          text-align: left;
          padding: 0;
          color: #24324f;
          cursor: pointer;
        }

        .avatar-picker-radio:focus-visible {
          outline: 2px solid rgba(108, 92, 231, 0.55);
          outline-offset: 4px;
          border-radius: 10px;
        }

        .avatar-picker-radio strong {
          display: block;
          font-size: 0.92rem;
        }

        .avatar-picker-radio small {
          display: block;
          margin-top: 0.2rem;
          color: #5a6a88;
          font-size: 0.78rem;
        }

        .avatar-picker-radio__bullet {
          width: 0.95rem;
          height: 0.95rem;
          border-radius: 999px;
          border: 1px solid #b9c7dd;
          margin-top: 0.2rem;
          background: #ffffff;
          box-shadow: inset 0 0 0 2px #ffffff;
          transition: border-color 140ms ease, background 140ms ease;
        }

        .avatar-picker-radio.is-active .avatar-picker-radio__bullet {
          border-color: #6c5ce7;
          background: #6c5ce7;
        }

        .avatar-picker-email {
          margin: 0;
          color: #64748b;
          font-size: 0.78rem;
        }

        .avatar-picker-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.55rem;
        }

        .avatar-picker-item {
          border: 1px solid #dbe4f1;
          border-radius: 12px;
          background: #f8fbff;
          padding: 0.25rem;
          cursor: pointer;
          transition: border-color 150ms ease, transform 150ms ease;
        }

        .avatar-picker-item:hover,
        .avatar-picker-item:focus-visible {
          border-color: #b8c6e0;
          transform: translateY(-1px);
        }

        .avatar-picker-item:focus-visible {
          outline: 2px solid rgba(108, 92, 231, 0.45);
          outline-offset: 2px;
        }

        .avatar-picker-item.is-selected {
          border-color: #6c5ce7;
          box-shadow: 0 0 0 2px rgba(108, 92, 231, 0.18);
        }

        .avatar-picker-item img {
          width: 100%;
          height: auto;
          display: block;
          border-radius: 9px;
        }

        .avatar-picker-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.55rem;
        }

        @media (max-width: 640px) {
          .avatar-picker-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
      `}</style>
    </Modal>
  );
}
