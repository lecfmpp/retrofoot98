import React from 'react';

export function energyColor(v) {
  if (v >= 80) return 'var(--energy-100)';
  if (v >= 70) return 'var(--energy-80)';
  if (v >= 55) return 'var(--energy-60)';
  if (v >= 40) return 'var(--energy-40)';
  return 'var(--energy-20)';
}

export function EnergyBar({ value, width = '100%', showValue = true, onDark = false, prefix }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, width }}>
      {prefix ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: onDark ? '#dff0e6' : 'var(--text-faint)', textShadow: onDark ? '0 1px 3px rgba(0,0,0,.65)' : undefined }}>{prefix}</span> : null}
      <div style={{ flex: 1, height: 'var(--bar-h-sm)', borderRadius: 'var(--r-pill)', background: onDark ? 'rgba(0,0,0,.35)' : 'var(--line-3)', overflow: 'hidden' }}>
        <div style={{ width: value + '%', height: '100%', borderRadius: 'var(--r-pill)', background: energyColor(value), transition: 'width var(--dur-base) var(--ease)' }} />
      </div>
      {showValue ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label)', color: onDark ? '#fff' : 'var(--text-3)', textShadow: onDark ? '0 1px 3px rgba(0,0,0,.65)' : undefined }}>{value}</span> : null}
    </div>
  );
}
