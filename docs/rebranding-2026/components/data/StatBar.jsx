import React from 'react';

export function StatBar({ label, value, max = 100, note, color = 'var(--club-primary)', height = 'var(--bar-h)' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)', fontFamily: 'var(--font-sans)' }}>
      {label ? <span style={{ fontSize: 'var(--fs-label)', fontWeight: 'var(--fw-bold)', color: 'var(--text-muted)', letterSpacing: 'var(--ls-label)' }}>{label}</span> : null}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 'var(--fw-semibold)', color: 'var(--text-1)' }}>{value}</span>
        {note ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', color: 'var(--text-4)' }}>{note}</span> : null}
      </div>
      <div style={{ height, borderRadius: 'var(--r-pill)', background: 'var(--line-3)', overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', borderRadius: 'var(--r-pill)', background: color, transition: 'width var(--dur-base) var(--ease)' }} />
      </div>
    </div>
  );
}
