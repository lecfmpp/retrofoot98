import React from 'react';

const COLS = '20px 24px minmax(0,1fr) 26px 34px 34px 42px 46px 58px';
const HEAD = ['', 'POS', 'NOME', 'ID', 'FRC', 'NOTA', 'ENER', 'SAL.', 'VALOR'];

export function SquadTable({ players = [], maxHeight = 560, onSelect }) {
  const mono = { fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: '0 8px', padding: '0 10px 6px', ...mono, fontSize: 'var(--fs-label)', color: 'var(--text-faint)', letterSpacing: '.06em' }}>
        {HEAD.map((h, i) => <span key={i} style={{ textAlign: i > 2 ? 'right' : 'left' }}>{h}</span>)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight, overflow: 'auto' }}>
        {players.map((p, i) => {
          const on = p.status === 'T';
          return (
            <div key={i} onClick={() => onSelect && onSelect(p)} style={{
              display: 'grid', gridTemplateColumns: COLS, gap: '0 8px', alignItems: 'center',
              padding: '7px 10px', borderRadius: 'var(--r-row)', cursor: 'pointer',
              background: i % 2 ? 'var(--surface-row-alt)' : 'var(--surface-card)'
            }}>
              <span style={{ width: 17, height: 17, borderRadius: 5, background: on ? 'var(--club-primary)' : '#eceff0', color: on ? 'var(--club-secondary)' : 'var(--text-muted)', fontSize: 'var(--fs-label-xs)', fontWeight: 'var(--fw-bold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.status}</span>
              <span style={{ ...mono, fontSize: 'var(--fs-micro)', color: on ? 'var(--club-primary)' : 'var(--text-faint)' }}>{p.pos}</span>
              <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--font-sans)', fontSize: 'var(--fs-body)', fontWeight: on ? 'var(--fw-semibold)' : 'var(--fw-medium)', color: on ? 'var(--text-1)' : 'var(--text-2)' }}>{p.name}</span>
              <span style={{ ...mono, color: 'var(--text-muted)', textAlign: 'right' }}>{p.age}</span>
              <span style={{ ...mono, fontSize: 'var(--fs-body-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-1)', textAlign: 'right' }}>{p.force}</span>
              <span style={{ ...mono, color: p.rating ? 'var(--note)' : '#c3ccc4', textAlign: 'right' }}>{p.rating || '–'}</span>
              <span style={{ ...mono, color: 'var(--text-3)', textAlign: 'right' }}>{p.energy}%</span>
              <span style={{ ...mono, color: 'var(--text-muted)', textAlign: 'right' }}>{p.wage}</span>
              <span style={{ ...mono, color: 'var(--text-1)', textAlign: 'right' }}>{p.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
