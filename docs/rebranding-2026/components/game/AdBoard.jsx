import React from 'react';

const TONES = ['var(--ad-dark)', 'var(--ad-orange)', 'var(--ad-green)'];

export function AdBoard({ items = ['ANUNCIE AQUI', 'SUA MARCA', 'PATROCÍNIO'], vertical = false, thickness = 47 }) {
  const common = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'var(--font-sans)', fontWeight: 'var(--fw-bold)', letterSpacing: 'var(--ls-label)', whiteSpace: 'nowrap' };
  return (
    <div style={vertical
      ? { display: 'flex', flexDirection: 'column', gap: 2, width: Math.round(thickness * .92) }
      : { display: 'flex', gap: 2, height: thickness }}>
      {items.map((t, i) => (
        <span key={i} style={{
          ...common, background: TONES[i % TONES.length],
          fontSize: vertical ? 'var(--fs-label-xs)' : 'var(--fs-label)',
          writingMode: vertical ? 'vertical-rl' : undefined,
          transform: vertical ? 'rotate(180deg)' : undefined
        }}>{t}</span>
      ))}
    </div>
  );
}
