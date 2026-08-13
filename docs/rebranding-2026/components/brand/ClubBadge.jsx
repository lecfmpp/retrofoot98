import React from 'react';

export function ClubBadge({ initials = 'XV', crest, size = 44, radius = 14, background = 'var(--club-primary)', color = 'var(--club-secondary)', ring = false }) {
  const [broken, setBroken] = React.useState(false);
  const showCrest = crest && !broken;
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flex: '0 0 auto',
      background: showCrest ? 'var(--surface-card)' : background,
      color, border: ring ? '2px solid var(--club-secondary)' : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-sans)', fontSize: Math.round(size / 3.1), fontWeight: 'var(--fw-bold)',
      overflow: 'hidden', boxSizing: 'border-box'
    }}>
      {showCrest
        ? <img src={crest} alt="" onError={() => setBroken(true)} style={{ width: size * .78, height: size * .78, objectFit: 'contain' }} />
        : initials}
    </div>
  );
}
