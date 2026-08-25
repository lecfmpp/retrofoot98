import React from 'react';

export function Chip({ label, hint, active = false, tone = 'default', onClick }) {
  const tones = {
    default: { bg: 'var(--surface-card)', fg: 'var(--text-2)', bd: 'var(--line-2)' },
    info: { bg: 'var(--club-primary-soft)', fg: 'var(--club-primary)', bd: 'var(--club-primary-line)' },
    warn: { bg: '#fdf3d4', fg: '#7a5c00', bd: '#f2e2a8' }
  };
  const t = tones[tone] || tones.default;
  return (
    <span onClick={onClick} style={{
      display: 'flex', flexDirection: hint ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: hint ? 2 : 6,
      border: '1px solid ' + (active ? 'var(--club-primary)' : t.bd),
      background: active ? 'var(--club-primary)' : t.bg,
      color: active ? 'var(--club-on-primary)' : t.fg,
      borderRadius: hint ? 'var(--r-chip)' : 'var(--r-pill)',
      padding: hint ? '7px 4px' : '6px 11px',
      fontFamily: 'var(--font-sans)', fontSize: 'var(--fs-micro)', fontWeight: 'var(--fw-semibold)',
      whiteSpace: 'nowrap', cursor: onClick ? 'pointer' : 'default',
      transition: 'background var(--dur-fast) var(--ease),color var(--dur-fast) var(--ease),border-color var(--dur-fast) var(--ease)'
    }}>
      <span style={{ fontFamily: hint ? 'var(--font-mono)' : 'inherit', fontSize: hint ? 'var(--fs-caption)' : 'inherit' }}>{label}</span>
      {hint ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label-xs)', fontWeight: 'var(--fw-medium)', color: active ? 'var(--club-secondary)' : 'var(--text-faint)' }}>{hint}</span> : null}
    </span>
  );
}
