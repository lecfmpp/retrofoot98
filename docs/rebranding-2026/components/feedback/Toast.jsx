import React from 'react';

const TONES = {
  info:    { glyph: '',  bg: 'var(--club-primary)', ink: '#fff',            line: 'var(--club-secondary)' },
  success: { glyph: '✓', bg: '#12201a',             ink: '#fff',            line: 'var(--ok)' },
  warn:    { glyph: '⚠', bg: '#12201a',             ink: '#fff',            line: 'var(--warn)' },
  danger:  { glyph: '✖', bg: '#12201a',             ink: '#fff',            line: 'var(--danger)' },
  progress:{ glyph: '',  bg: '#12201a',             ink: 'var(--text-on-dark-soft)', line: 'var(--text-faint)' }
};

export function Toast({ tone = 'info', glyph, children, action, onAction }) {
  const t = TONES[tone] || TONES.info;
  const icon = glyph !== undefined ? glyph : t.glyph;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--sp-5)',
      background: t.bg, color: t.ink, borderRadius: 'var(--r-control)',
      padding: '11px 16px', minHeight: 44, boxSizing: 'border-box',
      borderLeft: '4px solid ' + t.line, boxShadow: '0 10px 30px -18px rgba(0,0,0,.7)',
      fontFamily: 'var(--font-sans)', fontSize: 'var(--fs-body-sm)', fontWeight: 'var(--fw-medium)',
      maxWidth: 460, animation: 'ds-fade-up var(--dur-base) var(--ease)'
    }}>
      {icon ? <span style={{ flex: '0 0 auto', fontSize: 14 }}>{icon}</span> : null}
      <span style={{ flex: 1, minWidth: 0, lineHeight: 1.35 }}>{children}</span>
      {action ? (
        <span onClick={onAction} style={{
          flex: '0 0 auto', fontSize: 'var(--fs-caption)', fontWeight: 'var(--fw-bold)',
          color: 'var(--club-secondary)', whiteSpace: 'nowrap', cursor: 'pointer'
        }}>{action}</span>
      ) : null}
    </div>
  );
}

export function ToastStack({ children }) {
  return (
    <div style={{
      position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)',
      display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)', zIndex: 60, pointerEvents: 'none'
    }}>{children}</div>
  );
}
