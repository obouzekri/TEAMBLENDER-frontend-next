"use client";

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [menuPosition, setMenuPosition] = useState(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  const updateMenuPosition = () => {
    if (!triggerRef.current || typeof window === 'undefined') return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 220;
    const viewportPadding = 12;
    const left = Math.min(
      Math.max(viewportPadding, triggerRect.right - menuWidth),
      window.innerWidth - menuWidth - viewportPadding
    );
    setMenuPosition({
      top: triggerRect.bottom + 9,
      left,
      width: menuWidth,
    });
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    updateMenuPosition();

    function handlePointerOutside(event) {
      if (!menuRef.current) return;
      const path = typeof event.composedPath === 'function' ? event.composedPath() : null;
      if (Array.isArray(path) && path.includes(menuRef.current)) return;
      if (Array.isArray(path) && dropdownRef.current && path.includes(dropdownRef.current)) return;
      if (menuRef.current.contains(event.target)) return;
      if (dropdownRef.current?.contains(event.target)) return;

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
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerOutside, true);
      document.removeEventListener('touchstart', handlePointerOutside, true);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
    setMenuPosition(null);
  }, [closeSignal]);

  const handleAction = (item) => {
    setIsOpen(false);
    if (typeof item.onClick === 'function') {
      item.onClick();
    }
  };

  const dropdown = isOpen && menuPosition ? (
    <div
      className="nav-user-dropdown"
      role="menu"
      aria-label={menuLabel}
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: `${menuPosition.top}px`,
        left: `${menuPosition.left}px`,
        right: 'auto',
        width: `${menuPosition.width}px`,
        zIndex: 1600,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="nav-user-dropdown__header">
        <span className="nav-user-dropdown__name">{userLabel}</span>
        <span className="nav-user-dropdown__role">{roleLabel}</span>
      </div>
      <div className="nav-user-dropdown__divider" />
      {items.map((item) => {
        if (item.type === 'separator') {
          return <div key={item.key} className="nav-user-dropdown__divider" role="separator" />;
        }

        const itemClassName = `nav-user-dropdown__item${item.danger ? ' nav-user-dropdown__item--danger' : ''}`;
        if (item.href) {
          return (
            <Link
              key={item.key}
              href={item.href}
              className={itemClassName}
              role="menuitem"
              onClick={(event) => {
                event.stopPropagation();
                setIsOpen(false);
              }}
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
            onClick={(event) => {
              event.stopPropagation();
              handleAction(item);
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div className="nav-user-trigger-wrap" ref={menuRef} onClick={(event) => event.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        className={`nav-user-trigger${isOpen ? ' is-open' : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={triggerLabel}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((current) => !current);
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={triggerLabel} className="nav-user-avatar nav-user-avatar--trigger app-user-avatar--photo" />
        ) : (
          <span className="nav-user-avatar nav-user-avatar--trigger" aria-hidden="true">
            {avatarInitials}
          </span>
        )}
      </button>

      {dropdown ? createPortal(dropdown, document.body) : null}
    </div>
  );
}