import { useId } from 'react';

/** Papai Noel acenando (ilustração própria, SVG). O braço balança devagar; parado com prefers-reduced-motion. */
export function WavingSanta({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const u = useId().replace(/:/g, '');
  const id = (n: string) => `${n}-${u}`;
  return (
    <svg viewBox="-250 -235 560 545" className={className} style={style} aria-hidden="true">
      <defs>
        <linearGradient id={id('ws-red')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#E53A45" /><stop offset="1" stopColor="#A90F20" /></linearGradient>
        <radialGradient id={id('ws-skin')} cx="45%" cy="40%" r="65%"><stop offset="0" stopColor="#FFE3CF" /><stop offset="1" stopColor="#F7C4A6" /></radialGradient>
        <linearGradient id={id('ws-fur')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#E9EEF3" /></linearGradient>
        <filter id={id('ws-sh')} x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#2a0008" floodOpacity=".45" /></filter>
      </defs>
      <g filter={`url(#${id('ws-sh')})`}>
        <path d="M-190 300 Q-200 170 -110 140 L110 140 Q200 170 190 300 Z" fill={`url(#${id('ws-red')})`} />
        <rect x="-190" y="230" width="380" height="34" fill="#2B1B17" />
        <rect x="-22" y="226" width="44" height="42" rx="6" fill="none" stroke="#EABF35" strokeWidth="9" />
        {/* braço que acena */}
        <g className="santa-wave">
          <path d="M150 190 Q230 120 250 20" stroke={`url(#${id('ws-red')})`} strokeWidth="62" strokeLinecap="round" fill="none" />
          <ellipse cx="238" cy="36" rx="44" ry="22" transform="rotate(27 238 36)" fill={`url(#${id('ws-fur')})`} />
          <ellipse cx="262" cy="-18" rx="40" ry="48" fill="#6B2E1F" transform="rotate(18 262 -18)" />
          <ellipse cx="232" cy="-40" rx="14" ry="26" fill="#6B2E1F" transform="rotate(-25 232 -40)" />
        </g>
        <ellipse cx="0" cy="10" rx="128" ry="122" fill={`url(#${id('ws-skin')})`} />
        <ellipse cx="-62" cy="42" rx="26" ry="17" fill="#F49C9C" opacity=".75" /><ellipse cx="62" cy="42" rx="26" ry="17" fill="#F49C9C" opacity=".75" />
        <path d="M-140 10 Q-150 120 -95 185 Q-60 230 0 238 Q60 230 95 185 Q150 120 140 10 Q120 70 80 78 Q40 60 0 70 Q-40 60 -80 78 Q-120 70 -140 10 Z" fill={`url(#${id('ws-fur')})`} />
        <g fill="#FFFFFF"><circle cx="-110" cy="120" r="34" /><circle cx="110" cy="120" r="34" /><circle cx="-70" cy="180" r="40" /><circle cx="70" cy="180" r="40" /><circle cx="0" cy="205" r="44" /></g>
        <path d="M0 62 Q-30 40 -70 52 Q-95 62 -98 86 Q-60 70 -30 86 Q-10 92 0 78 Q10 92 30 86 Q60 70 98 86 Q95 62 70 52 Q30 40 0 62 Z" fill="#FFFFFF" stroke="#E3E8ED" strokeWidth="3" />
        <ellipse cx="0" cy="46" rx="22" ry="18" fill="#F07A7A" /><ellipse cx="-6" cy="40" rx="7" ry="5" fill="#fff" opacity=".6" />
        <path d="M-62 2 Q-46 -16 -30 2" stroke="#4A2620" strokeWidth="7" strokeLinecap="round" fill="none" />
        <path d="M30 2 Q46 -16 62 2" stroke="#4A2620" strokeWidth="7" strokeLinecap="round" fill="none" />
        <path d="M-78 -32 Q-48 -52 -20 -36" stroke="#fff" strokeWidth="14" strokeLinecap="round" fill="none" />
        <path d="M20 -36 Q48 -52 78 -32" stroke="#fff" strokeWidth="14" strokeLinecap="round" fill="none" />
        <path d="M140 -50 Q120 -190 -10 -205 Q-120 -210 -175 -120 Q-200 -80 -215 -30 Q-170 -95 -120 -80 L-140 -50 Z" fill={`url(#${id('ws-red')})`} />
        <circle cx="-222" cy="-20" r="36" fill={`url(#${id('ws-fur')})`} />
        <rect x="-160" y="-78" width="320" height="64" rx="32" fill={`url(#${id('ws-fur')})`} />
      </g>
    </svg>
  );
}
