import React from 'react';

export function Jersey({ number, size = 54, goalkeeper = false, bib = false, captain = false }) {
  const w = size, h = Math.round(size * .93);
  const body = goalkeeper ? 'var(--club-secondary)' : 'var(--club-primary)';
  const trim = goalkeeper ? 'var(--club-primary)' : 'var(--club-secondary)';
  const ink = goalkeeper ? 'var(--club-primary)' : 'var(--club-secondary)';
  const s = v => Math.round(v * (size / 54));
  return (
    <div style={{ position: 'relative', width: w, height: h, flex: '0 0 auto', filter: 'var(--shadow-piece)' }}>
      <div style={{ position: 'absolute', left: 0, top: s(9), width: s(16), height: s(20), background: trim, borderRadius: '5px 3px 7px 6px', transform: 'rotate(-16deg)' }} />
      <div style={{ position: 'absolute', right: 0, top: s(9), width: s(16), height: s(20), background: trim, borderRadius: '3px 5px 6px 7px', transform: 'rotate(16deg)' }} />
      <div style={{ position: 'absolute', left: s(12), top: s(5), width: s(30), height: s(45), background: body, borderRadius: '5px 5px 8px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!bib ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: s(17), fontWeight: 'var(--fw-semibold)', color: ink, marginTop: s(5) }}>{number}</span> : null}
      </div>
      {bib ? (
        <div style={{ position: 'absolute', left: s(15), top: s(10), width: s(24), height: s(38), background: 'var(--club-secondary)', borderRadius: '4px 4px 6px 6px', boxShadow: 'inset 0 0 0 1px rgba(23,69,143,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: s(14), fontWeight: 'var(--fw-semibold)', color: 'var(--club-primary)' }}>{number}</span>
        </div>
      ) : null}
      <div style={{ position: 'absolute', left: '50%', top: s(3), transform: 'translateX(-50%)', width: s(17), height: s(8), background: trim, borderRadius: '0 0 9px 9px' }} />
      {captain ? <span style={{ position: 'absolute', right: -2, top: s(16), fontFamily: 'var(--font-mono)', fontSize: s(9), fontWeight: 'var(--fw-bold)', color: 'var(--club-primary)', background: 'var(--club-secondary)', borderRadius: 4, padding: '1px 3px' }}>C</span> : null}
    </div>
  );
}
