import React from 'react';
import { ClubBadge } from '../brand/ClubBadge.jsx';

export function OpponentCard({ opponent = 'Cianorte', initials = 'CIA', crest, meta = 'FORA · SÉRIE D · 8ª JORNADA', date = '25/abr · 2026', rows = [], action, height = 260 }) {
  const COLS = 'minmax(0,1fr) 22px 22px 22px 40px 26px';
  const mono = { fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)' };
  return (
    <div style={{
      height, boxSizing: 'border-box', background: 'var(--club-primary)', borderRadius: 'var(--r-card)',
      padding: 'var(--pad-shell)', color: 'var(--text-on-dark)', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', gap: 'var(--sp-6)', minWidth: 0, fontFamily: 'var(--font-sans)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 'var(--fs-label)', fontWeight: 'var(--fw-semibold)', letterSpacing: 'var(--ls-label)', color: 'var(--text-on-dark-soft)' }}>ADVERSÁRIO</span>
        <span style={{ ...mono, color: 'var(--club-secondary)' }}>{date}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ClubBadge initials={initials} crest={crest} size={36} radius={11} background="var(--surface-card)" color="var(--club-primary)" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
          <span style={{ fontSize: 'var(--fs-heading)', fontWeight: 'var(--fw-bold)', letterSpacing: 'var(--ls-tight)', whiteSpace: 'nowrap' }}>{opponent}</span>
          <span style={{ ...mono, fontSize: 'var(--fs-micro)', color: 'var(--text-on-dark-soft)', whiteSpace: 'nowrap' }}>{meta}</span>
        </div>
      </div>
      <div style={{ background: 'rgba(255,255,255,.09)', borderRadius: 'var(--r-control)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 'var(--gap-tight)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 6, ...mono, fontSize: 'var(--fs-label)', color: 'var(--text-on-dark-faint)' }}>
          <span /><span style={{ textAlign: 'right' }}>J</span><span style={{ textAlign: 'right' }}>V</span><span style={{ textAlign: 'right' }}>D</span><span style={{ textAlign: 'right' }}>GM:GS</span><span style={{ textAlign: 'right' }}>P</span>
        </div>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: COLS, gap: 6, ...mono, color: r.dim ? 'var(--text-on-dark-soft)' : 'inherit' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 'var(--fw-semibold)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
            <span style={{ textAlign: 'right' }}>{r.j}</span><span style={{ textAlign: 'right' }}>{r.v}</span>
            <span style={{ textAlign: 'right' }}>{r.d}</span><span style={{ textAlign: 'right' }}>{r.goals}</span>
            <span style={{ textAlign: 'right' }}>{r.points}</span>
          </div>
        ))}
      </div>
      {action}
    </div>
  );
}
