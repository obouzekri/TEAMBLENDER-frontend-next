'use client';

import styles from './Button.module.css';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  className = '',
  type = 'button',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        styles.button,
        styles[variant],
        styles[size],
        block ? styles.block : '',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
