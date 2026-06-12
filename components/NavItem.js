"use client";

import Link from 'next/link';

export default function NavItem({ href, active = false, className = '', children, onClick, ariaCurrent, ...rest }) {
  const classes = ['nav-link'];
  if (active) classes.push('is-active');
  if (className) classes.push(className);

  return (
    <Link
      href={href}
      className={classes.join(' ')}
      aria-current={ariaCurrent || (active ? 'page' : undefined)}
      onClick={onClick}
      {...rest}
    >
      {children}
    </Link>
  );
}