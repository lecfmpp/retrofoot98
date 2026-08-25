import React from 'react';

export function MenuBar({ items = [], activeIndex = 0, onSelect, trailing }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--gap-tight)',
      background: 'var(--surface-card)', border: 'var(--border-hairline)',
      borderRadius: 'var(--r-inner)', padding: 'var(--sp-3)', fontFamily: 'var(--font-sans)'
    }}>
      {items.map((it, i) => it === '|'
        ? <span key={i} style={{ width: 1, height: 22, background: 'var(--line-1)', margin: '0 6px' }} />
        : (
          <span key={i} onClick={() => onSelect && onSelect(i)} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            fontSize: 'var(--fs-body-sm)', fontWeight: i === activeIndex ? 'var(--fw-bold)' : 'var(--fw-medium)',
            color: i === activeIndex ? 'var(--club-on-primary)' : 'var(--text-2)',
            background: i === activeIndex ? 'var(--club-primary)' : 'transparent',
            borderRadius: 'var(--r-control)', padding: '8px 13px', whiteSpace: 'nowrap', cursor: 'pointer',
            transition: 'background var(--dur-fast) var(--ease)'
          }}>
            {it.icon ? <span style={{ fontSize: 14 }}>{it.icon}</span> : null}
            {it.label || it}
            {it.badge ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', fontWeight: 'var(--fw-bold)', color: '#fff', background: 'var(--note)', borderRadius: 'var(--r-pill)', padding: '1px 6px' }}>{it.badge}</span> : null}
          </span>
        ))}
      {trailing ? <><div style={{ flex: 1 }} />{trailing}</> : null}
    </div>
  );
}
