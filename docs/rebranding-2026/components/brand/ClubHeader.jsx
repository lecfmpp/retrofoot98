import React from 'react';
import { ClubBadge } from './ClubBadge.jsx';

export function ClubHeader({ club = 'XV Piracicaba', manager = 'Gringo', meta = '🇧🇷 Brasil · Série D · 2026', crest, initials = 'XV', form = ['V','V','E','D','V'], cash = 'R$ 1,27 mi', payroll = 'folha R$ 184 mil/mês', countdown = '2d 14h', action }) {
  const formColor = r => r === 'V' ? 'var(--energy-100)' : r === 'E' ? 'var(--club-secondary)' : 'var(--danger)';
  const formInk = r => r === 'D' ? '#fff' : r === 'E' ? '#4a3c00' : '#0d3d22';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--sp-8)', position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(100deg,var(--club-primary-deep),var(--club-primary) 62%)',
      borderRadius: 'var(--r-card)', padding: '16px 20px', fontFamily: 'var(--font-sans)'
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: 'var(--club-secondary)' }} />
      <div style={{ marginLeft: 6 }}><ClubBadge initials={initials} crest={crest} size={48} background="var(--surface-card)" color="var(--club-primary)" /></div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '0 0 auto' }}>
        <span style={{ fontSize: 'var(--fs-display)', fontWeight: 'var(--fw-bold)', color: 'var(--text-on-dark)', letterSpacing: 'var(--ls-tight)', whiteSpace: 'nowrap' }}>{club}</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 'var(--fs-caption)', color: 'var(--text-on-dark-soft)', whiteSpace: 'nowrap' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 'var(--fw-bold)', color: 'var(--club-secondary)' }}>{manager}</span>
          <span style={{ fontSize: 'var(--fs-label)', fontWeight: 'var(--fw-bold)', letterSpacing: 'var(--ls-label-wide)' }}>TREINADOR</span>
          <span>{meta}</span>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, paddingRight: 'var(--sp-8)' }}>
        <span style={{ fontSize: 'var(--fs-label-xs)', fontWeight: 'var(--fw-semibold)', letterSpacing: 'var(--ls-label)', color: 'var(--text-on-dark-faint)' }}>EM CAIXA</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 'var(--fw-semibold)', color: 'var(--text-on-dark)', whiteSpace: 'nowrap' }}>{cash}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: 'var(--club-secondary)', whiteSpace: 'nowrap' }}>{payroll}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '0 16px', borderLeft: '1px solid rgba(255,255,255,.15)', borderRight: '1px solid rgba(255,255,255,.15)' }}>
        <span style={{ fontSize: 'var(--fs-label-xs)', fontWeight: 'var(--fw-semibold)', letterSpacing: 'var(--ls-label)', color: 'var(--text-on-dark-faint)' }}>FORMA</span>
        <div style={{ display: 'flex', gap: 3 }}>
          {form.map((r, i) => (
            <span key={i} style={{ width: 18, height: 18, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', fontWeight: 'var(--fw-bold)', color: formInk(r), background: formColor(r) }}>{r}</span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, paddingLeft: 'var(--sp-8)' }}>
        <span style={{ fontSize: 'var(--fs-label-xs)', fontWeight: 'var(--fw-semibold)', letterSpacing: 'var(--ls-label)', color: 'var(--text-on-dark-faint)' }}>APITO INICIAL EM</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-subhead)', fontWeight: 'var(--fw-semibold)', color: 'var(--club-secondary)' }}>{countdown}</span>
      </div>

      {action ? <div style={{ marginLeft: 'var(--sp-8)' }}>{action}</div> : null}
    </div>
  );
}
