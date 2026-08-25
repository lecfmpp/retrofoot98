import React from 'react';

export function SectionLabel({ children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--fs-label)', fontWeight: 'var(--fw-bold)', color: 'var(--text-muted)', letterSpacing: 'var(--ls-label)', whiteSpace: 'nowrap' }}>{children}</span>
      {right ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-micro)', color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>{right}</span> : null}
    </div>
  );
}
