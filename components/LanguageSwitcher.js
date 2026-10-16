"use client";

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Globe2 } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import useI18n from '@/lib/i18n/useI18n';
import { useI18nContext } from '@/lib/i18n/I18nProvider';
import { SUPPORTED_LOCALES, withLocalePath, stripLocaleFromPath } from '@/lib/i18n/routing';
import styles from './LanguageSwitcher.module.css';

const languageNames = { fr: 'Fran\u00e7ais', en: 'English' };

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  const { locale, t } = useI18n();
  const { setLocale } = useI18nContext();
  const switcherId = useId();
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const initialFocusRef = useRef(locale);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!isOpen) return undefined;

    function updatePosition() {
      const trigger = triggerRef.current.getBoundingClientRect();
      const menu = menuRef.current.getBoundingClientRect();
      setPosition({
        left: Math.max(12, Math.min(trigger.right - menu.width, window.innerWidth - menu.width - 12)),
        top: trigger.bottom + menu.height + 8 <= window.innerHeight - 12
          ? trigger.bottom + 8
          : Math.max(12, trigger.top - menu.height - 8),
      });
    }

    function dismissOutside(event) {
      if (!triggerRef.current.contains(event.target) && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    updatePosition();
    menuRef.current.querySelector(`[data-locale="${initialFocusRef.current}"]`)?.focus();
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('focusin', dismissOutside);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('focusin', dismissOutside);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  const basePath = stripLocaleFromPath(pathname || '/');
  const query = searchParams?.toString() || '';

  const handleLocaleChange = (newLocale) => {
    setIsOpen(false);
    triggerRef.current.focus();
    if (newLocale === locale) return;
    // Update context (triggers immediate re-render globally)
    setLocale(newLocale);
    
    // Update URL
    const newHref = withLocalePath(newLocale, `${basePath}${query ? `?${query}` : ''}`);
    router.push(newHref);
  };

  const openMenu = (targetLocale = locale) => {
    initialFocusRef.current = targetLocale;
    setIsOpen(true);
  };

  const handleMenuKeyDown = (event) => {
    const items = [...menuRef.current.querySelectorAll('[role="menuitemradio"]')];
    const index = items.indexOf(document.activeElement);
    let nextIndex;
    if (event.key === 'ArrowDown') nextIndex = (index + 1) % items.length;
    if (event.key === 'ArrowUp') nextIndex = (index - 1 + items.length) % items.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = items.length - 1;
    if (nextIndex !== undefined) {
      event.preventDefault();
      items[nextIndex].focus();
    }
    if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
      }
      setIsOpen(false);
      triggerRef.current.focus();
    }
  };

  return (
    <div className="lang-switch">
      <Globe2 className="lang-switch__icon" size={15} aria-hidden="true" />
      <span className="lang-switch__value" aria-hidden="true">{String(locale || 'fr').toUpperCase()}</span>
      <ChevronDown className={`lang-switch__chevron ${styles.chevron}`} size={13} aria-hidden="true" data-open={isOpen} />
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={`${t('language.switcherAria')}: ${languageNames[locale]}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? switcherId : undefined}
        onClick={() => isOpen ? setIsOpen(false) : openMenu()}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            openMenu(event.key === 'ArrowUp' ? SUPPORTED_LOCALES.at(-1) : SUPPORTED_LOCALES[0]);
          }
        }}
      />
      {isOpen && createPortal(
        <div
          ref={menuRef}
          id={switcherId}
          role="menu"
          aria-label={t('language.switcherAria')}
          className={styles.menu}
          style={position}
          onKeyDown={handleMenuKeyDown}
        >
          <div className={styles.heading} aria-hidden="true">{t('language.switcherAria')}</div>
          {SUPPORTED_LOCALES.map((targetLocale) => (
            <button
              key={targetLocale}
              type="button"
              role="menuitemradio"
              aria-checked={locale === targetLocale}
              tabIndex={-1}
              data-locale={targetLocale}
              className={styles.option}
              onClick={() => handleLocaleChange(targetLocale)}
            >
              <span className={styles.code}>{targetLocale.toUpperCase()}</span>
              <span lang={targetLocale}>{languageNames[targetLocale]}</span>
              {locale === targetLocale && <Check className={styles.check} size={16} aria-hidden="true" />}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
