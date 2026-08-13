import React from 'react';
import { Chip } from '../core/Chip.jsx';

export const FORMATIONS = [
  { name: '3-3-4', key: 'F1' }, { name: '3-4-3', key: 'F2' }, { name: '4-2-4', key: 'F3' },
  { name: '4-3-3', key: 'F4' }, { name: '4-4-2', key: 'F5' }, { name: '4-5-1', key: 'F6' },
  { name: 'Auto', key: 'A' }, { name: '11+ Melhores', key: 'M' }
];

export function FormationGrid({ formations = FORMATIONS, active = '3-3-4', columns = 4, onSelect, footer }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)', flex: 1, justifyContent: 'space-between' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + columns + ',minmax(0,1fr))', gap: 'var(--gap-tight)' }}>
        {formations.map(f => (
          <Chip key={f.name} label={f.name} hint={f.key} active={f.name === active} onClick={() => onSelect && onSelect(f.name)} />
        ))}
      </div>
      {footer}
    </div>
  );
}
