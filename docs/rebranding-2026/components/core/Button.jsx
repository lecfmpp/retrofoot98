import React from 'react';

const base = {
  fontFamily: 'var(--font-sans)', fontWeight: 'var(--fw-semibold)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  whiteSpace: 'nowrap', boxSizing: 'border-box', transition: 'background var(--dur-fast) var(--ease)'
};

export function Button({ variant = 'secondary', pulse = false, full = false, children, onClick, disabled = false }) {
  const skins = {
    primary: { height: 'var(--h-cta)', border: 'none', borderRadius: 'var(--r-inner)', background: 'var(--club-secondary)', color: 'var(--club-on-secondary)', fontSize: 'var(--fs-subhead)', fontWeight: 'var(--fw-bold)', padding: '0 18px' },
    secondary: { height: 'var(--h-control)', border: 'var(--border-control)', borderRadius: 'var(--r-control)', background: 'var(--surface-card)', color: 'var(--text-2)', fontSize: 'var(--fs-body-sm)', padding: '0 14px' },
    dark: { height: 'var(--h-control)', border: 'none', borderRadius: 'var(--r-control)', background: 'var(--club-primary)', color: 'var(--club-on-primary)', fontSize: 'var(--fs-body-sm)', padding: '0 14px' },
    pill: { height: 36, border: 'none', borderRadius: 'var(--r-pill)', background: 'var(--club-secondary)', color: 'var(--club-on-secondary)', fontSize: 'var(--fs-caption)', padding: '0 14px' },
    quiet: { height: 36, border: 'var(--border-control)', borderRadius: 'var(--r-chip)', background: 'transparent', color: 'var(--club-primary)', fontSize: 'var(--fs-caption)', padding: '0 12px' }
  };
  return (
    <button disabled={disabled} onClick={onClick} style={{
      ...base, ...skins[variant],
      width: full ? '100%' : undefined,
      opacity: disabled ? .5 : 1, cursor: disabled ? 'default' : 'pointer',
      animation: pulse && !disabled ? 'ds-cta-pulse 2.4s ease-in-out infinite' : undefined
    }}>{children}</button>
  );
}
