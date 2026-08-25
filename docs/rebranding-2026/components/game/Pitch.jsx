import React from 'react';
import { Jersey } from './Jersey.jsx';
import { EnergyBar } from '../data/EnergyBar.jsx';

const LINE = 'var(--pitch-line)';

export function Pitch({ lines = [], watermark, minHeight = 520 }) {
  const mark = (style) => <div style={{ position: 'absolute', ...style }} />;
  return (
    <div style={{
      flex: 1, minWidth: 0, position: 'relative', borderRadius: 6, overflow: 'hidden',
      background: 'repeating-linear-gradient(180deg,var(--pitch-1) 0 46px,var(--pitch-2) 46px 92px)',
      boxShadow: 'var(--shadow-pitch)', padding: '16px 10px', minHeight,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12
    }}>
      {mark({ left: 10, right: 10, top: 10, bottom: 10, border: '2px solid ' + LINE, borderRadius: 4, pointerEvents: 'none' })}
      {mark({ left: 10, right: 10, top: '50%', height: 2, background: LINE })}
      {mark({ left: '50%', top: 'calc(50% - 40px)', width: 80, height: 80, border: '2px solid ' + LINE, borderRadius: '99px', transform: 'translateX(-50%)' })}
      {mark({ left: '50%', top: '50%', width: 7, height: 7, borderRadius: '99px', background: 'rgba(255,255,255,.6)', transform: 'translate(-50%,-50%)' })}
      {mark({ left: '50%', bottom: 10, width: 180, height: 64, border: '2px solid ' + LINE, borderBottom: 'none', transform: 'translateX(-50%)' })}
      {mark({ left: '50%', bottom: 10, width: 86, height: 26, border: '2px solid ' + LINE, borderBottom: 'none', transform: 'translateX(-50%)' })}
      {mark({ left: '50%', top: 10, width: 180, height: 64, border: '2px solid ' + LINE, borderTop: 'none', transform: 'translateX(-50%)' })}
      {mark({ left: '50%', top: 10, width: 86, height: 26, border: '2px solid ' + LINE, borderTop: 'none', transform: 'translateX(-50%)' })}
      {mark({ left: '50%', bottom: 52, width: 6, height: 6, borderRadius: '99px', background: 'rgba(255,255,255,.5)', transform: 'translateX(-50%)' })}
      {mark({ left: '50%', top: 52, width: 6, height: 6, borderRadius: '99px', background: 'rgba(255,255,255,.5)', transform: 'translateX(-50%)' })}
      {mark({ left: 10, top: 10, width: 22, height: 22, borderRight: '2px solid ' + LINE, borderBottom: '2px solid ' + LINE, borderRadius: '0 0 22px 0' })}
      {mark({ right: 10, top: 10, width: 22, height: 22, borderLeft: '2px solid ' + LINE, borderBottom: '2px solid ' + LINE, borderRadius: '0 0 0 22px' })}
      {mark({ left: 10, bottom: 10, width: 22, height: 22, borderRight: '2px solid ' + LINE, borderTop: '2px solid ' + LINE, borderRadius: '0 22px 0 0' })}
      {mark({ right: 10, bottom: 10, width: 22, height: 22, borderLeft: '2px solid ' + LINE, borderTop: '2px solid ' + LINE, borderRadius: '22px 0 0 0' })}
      {watermark ? <img src={watermark} alt="" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 190, height: 190, objectFit: 'contain', opacity: .1, filter: 'brightness(0) invert(1)', pointerEvents: 'none' }} /> : null}

      {lines.map((line, li) => (
        <div key={li} style={{ position: 'relative', display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start' }}>
          {line.map((p, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
              <Jersey number={p.number} size={44} goalkeeper={p.pos === 'G'} captain={p.captain} />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--fs-micro)', fontWeight: 'var(--fw-bold)', color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,.65)', whiteSpace: 'nowrap' }}>{p.name}</span>
              <EnergyBar value={p.energy} prefix={p.pos} width={76} onDark />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
