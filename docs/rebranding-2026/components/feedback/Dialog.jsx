import React from 'react';

export function Dialog({ title, glyph, badge, subtitle, width = 520, tone = 'light', onClose, footer, children }) {
  const dark = tone === 'club';
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(18,32,26,.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      fontFamily: 'var(--font-sans)'
    }}>
      <div style={{
        width, maxWidth: '100%', background: 'var(--surface-desk)', border: '1px solid var(--line-2)',
        borderRadius: 'var(--r-shell)', padding: 'var(--pad-shell)', boxSizing: 'border-box',
        boxShadow: '0 24px 60px -30px rgba(0,0,0,.6)', display: 'flex', flexDirection: 'column', gap: 'var(--gap-grid)',
        animation: 'ds-fade-up var(--dur-base) var(--ease)'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--sp-6)', position: 'relative', overflow: 'hidden',
          background: dark ? 'linear-gradient(100deg,var(--club-primary-deep),var(--club-primary) 62%)' : 'var(--surface-card)',
          border: dark ? 'none' : 'var(--border-hairline)',
          borderRadius: 'var(--r-card)', padding: '14px 18px'
        }}>
          {dark ? <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: 'var(--club-secondary)' }} /> : null}
          {glyph ? <span style={{ fontSize: 18, marginLeft: dark ? 6 : 0, flex: '0 0 auto' }}>{glyph}</span> : null}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 'var(--fs-heading)', fontWeight: 'var(--fw-bold)', letterSpacing: 'var(--ls-tight)', color: dark ? 'var(--text-on-dark)' : 'var(--text-1)', whiteSpace: 'nowrap' }}>{title}</span>
            {subtitle ? <span style={{ fontSize: 'var(--fs-caption)', color: dark ? 'var(--text-on-dark-soft)' : 'var(--text-4)', whiteSpace: 'nowrap' }}>{subtitle}</span> : null}
          </div>
          <div style={{ flex: 1 }} />
          {badge ? <span style={{ flex: '0 0 auto', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-micro)', fontWeight: 'var(--fw-semibold)', color: 'var(--club-on-secondary)', background: 'var(--club-secondary)', borderRadius: 'var(--r-pill)', padding: '4px 10px', whiteSpace: 'nowrap' }}>{badge}</span> : null}
          {onClose ? <span onClick={onClose} style={{ flex: '0 0 auto', marginLeft: 10, fontSize: 'var(--fs-body-sm)', fontWeight: 'var(--fw-semibold)', color: dark ? '#fff' : 'var(--text-3)', cursor: 'pointer' }}>✖</span> : null}
        </div>

        <div style={{ background: 'var(--surface-card)', border: 'var(--border-hairline)', borderRadius: 'var(--r-card)', padding: 'var(--pad-card)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
          {children}
        </div>

        {footer ? <div style={{ display: 'flex', gap: 'var(--sp-4)', justifyContent: 'flex-end' }}>{footer}</div> : null}
      </div>
    </div>
  );
}
