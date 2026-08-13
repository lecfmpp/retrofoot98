import React from 'react';
import { Jersey } from './Jersey.jsx';
import { energyColor } from '../data/EnergyBar.jsx';

export function BenchList({ groups = [], width = 196, total }) {
  return (
    <div style={{ width, flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--gap-tight)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'var(--text-faint)', letterSpacing: '.1em' }}>SUPLENTES</span>
        {total != null ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'var(--text-faint)' }}>{total}</span> : null}
      </div>
      {groups.map((g, gi) => (
        <div key={gi} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: 'var(--fs-label-xs)', fontWeight: 'var(--fw-bold)', color: 'var(--text-muted)', letterSpacing: 'var(--ls-label)', padding: '2px 5px' }}>{g.label}</span>
          {g.players.map((p, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '30px 1fr 20px', gap: 7, alignItems: 'center', padding: '3px 5px', borderRadius: 'var(--r-tag)', cursor: 'pointer' }}>
              <Jersey number={p.number} size={30} bib />
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 'var(--fs-micro)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-1)' }}>{p.name}</span>
                <div style={{ height: 3, borderRadius: 'var(--r-pill)', background: 'var(--line-3)', overflow: 'hidden' }}>
                  <div style={{ width: p.energy + '%', height: '100%', borderRadius: 'var(--r-pill)', background: energyColor(p.energy) }} />
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-micro)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-3)', textAlign: 'right' }}>{p.force}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
