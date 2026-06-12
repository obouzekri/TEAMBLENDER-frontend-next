"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function AvatarMenu({
  userLabel,
  roleLabel,
  avatarUrl,
  avatarInitials,
  triggerLabel,
  menuLabel,
  items,
  closeSignal,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerOutside(event) {
      if (!menuRef.current) return;
      const path = typeof event.composedPath === 'function' ? event.composedPath() : null;
      if (Array.isArray(path) && path.includes(menuRef.current)) return;
      if (!menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerOutside, true);
    document.addEventListener('touchstart', handlePointerOutside, true);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerOutside, true);
      document.removeEventListener('touchstart', handlePointerOutside, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [closeSignal]);

  const handleAction = (item) => {
    setIsOpen(false);
    if (typeof item.onClick === 'function') {
      item.onClick();
    }
  };

  return (
    <div className="nav-user-trigger-wrap" ref={menuRef}>
      <button
        type="button"
        className={`nav-user-trigger${isOpen ? ' is-open' : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={triggerLabel}
        onClick={() => setIsOpen((current) => !current)}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={triggerLabel} className="nav-user-avatar nav-user-avatar--trigger app-user-avatar--photo" />
        ) : (
          <span className="nav-user-avatar nav-user-avatar--trigger" aria-hidden="true">
            {avatarInitials}
          </span>
        )}
      </button>

      {isOpen ? (
        <div className="nav-user-dropdown" role="menu" aria-label={menuLabel}>
          <div className="nav-user-dropdown__header">
            <span className="nav-user-dropdown__name">{userLabel}</span>
            <span className="nav-user-dropdown__role">{roleLabel}</span>
          </div>
          <div className="nav-user-dropdown__divider" />
          {items.map((item) => {
            const itemClassName = `nav-user-dropdown__item${item.danger ? ' nav-user-dropdown__item--danger' : ''}`;
            if (item.href) {
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={itemClassName}
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              );
            }

            return (
              <button
                key={item.key}
                type="button"
                className={itemClassName}
                role="menuitem"
                onClick={() => handleAction(item)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}