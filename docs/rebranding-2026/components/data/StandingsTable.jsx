import React from 'react';

const COLS = '32px minmax(0,1fr) 20px 20px 20px 20px 34px 24px';

export function StandingsTable({ rows = [], animateKey = 0 }) {
  const mono = { fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-micro)' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', minWidth: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: '0 6px', padding: '0 8px 2px', ...mono, fontSize: 'var(--fs-label-xs)', color: 'var(--text-faint)', letterSpacing: '.06em' }}>
        <span /><span /><span style={{ textAlign: 'right' }}>J</span><span style={{ textAlign: 'right' }}>V</span><span style={{ textAlign: 'right' }}>E</span><span style={{ textAlign: 'right' }}>D</span><span style={{ textAlign: 'right' }}>GM:GS</span><span style={{ textAlign: 'right' }}>P</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, animation: 'ds-fade-up var(--dur-base) var(--ease)' }} key={animateKey}>
        {rows.map((r, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: COLS, gap: '0 6px', alignItems: 'center',
            padding: '6px 8px', borderRadius: 'var(--r-row)', cursor: 'pointer',
            background: r.mine ? 'var(--surface-row-active)' : 'transparent'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 3, height: 14, borderRadius: 'var(--r-pill)', background: r.zone || 'var(--zone-neutral)' }} />
              <span style={{ ...mono, fontWeight: 'var(--fw-semibold)', color: r.mine ? 'var(--club-primary)' : 'var(--text-muted)' }}>{r.pos}</span>
            </span>
            <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--font-sans)', fontSize: 'var(--fs-body-sm)', fontWeight: r.mine ? 'var(--fw-bold)' : 'var(--fw-medium)', color: r.mine ? 'var(--text-1)' : 'var(--text-2)' }}>{r.name}</span>
            {['j','v','e','d'].map(k => <span key={k} style={{ ...mono, color: 'var(--text-muted)', textAlign: 'right' }}>{r[k]}</span>)}
            <span style={{ ...mono, color: 'var(--text-3)', textAlign: 'right' }}>{r.goals}</span>
            <span style={{ ...mono, fontSize: 'var(--fs-caption)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-1)', textAlign: 'right' }}>{r.points}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
