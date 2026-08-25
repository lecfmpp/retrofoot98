import React from 'react';

export function Card({ tone = 'light', pad = 'var(--pad-card)', grow = false, height, children, style }) {
  const tones = {
    light: { background: 'var(--surface-card)', border: 'var(--border-hairline)', color: 'var(--text-1)' },
    club: { background: 'var(--club-primary)', border: 'none', color: 'var(--text-on-dark)' },
    quiet: { background: 'var(--surface-sunken)', border: 'var(--border-hairline)', color: 'var(--text-2)' }
  };
  return (
    <div style={{
      ...tones[tone], borderRadius: 'var(--r-card)', padding: pad,
      display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)',
      flex: grow ? 1 : undefined, height, boxSizing: 'border-box', minWidth: 0,
      fontFamily: 'var(--font-sans)', ...style
    }}>{children}</div>
  );
}
