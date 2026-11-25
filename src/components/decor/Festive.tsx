/**
 * Elementos natalinos de ambientação: neve, enfeites pendurados e guirlanda.
 * Tudo decorativo (aria-hidden), leve e desativado com prefers-reduced-motion.
 */
import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/* ------------------------------------------------------------------ */
/* Neve suave em canvas: poucos flocos, lentos, sem atrapalhar a leitura */
/* ------------------------------------------------------------------ */
export function Snowfall({ className, density = 1 }: { className?: string; density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || reduced) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let w = 0, h = 0, raf = 0, visible = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    type Flake = { x: number; y: number; r: number; vy: number; phase: number; amp: number; a: number };
    let flakes: Flake[] = [];
    const make = (y?: number): Flake => ({
      x: Math.random() * w, y: y ?? Math.random() * h, r: 0.8 + Math.random() * 2.2,
      vy: 0.18 + Math.random() * 0.45, phase: Math.random() * Math.PI * 2, amp: 0.2 + Math.random() * 0.5, a: 0.35 + Math.random() * 0.5,
    });
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const weak = (navigator.hardwareConcurrency ?? 8) <= 4;
      const n = Math.round(Math.min(weak ? 35 : 70, (w * h) / 14000) * density);
      flakes = Array.from({ length: n }, () => make());
    };
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const f of flakes) {
        f.y += f.vy; f.phase += 0.01; f.x += Math.sin(f.phase) * f.amp;
        if (f.y > h + 4) Object.assign(f, make(-4));
        ctx.globalAlpha = f.a;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fillStyle = '#FFF8EC'; ctx.fill();
      }
      raf = visible && !document.hidden ? requestAnimationFrame(tick) : 0;
    };
    const restart = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(tick); };
    resize();
    restart();
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; restart(); });
    io.observe(canvas);
    document.addEventListener('visibilitychange', restart);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', restart); };
  }, [reduced, density]);

  return <canvas ref={ref} aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ''}`} />;
}

/* ------------------------------------------------------------------ */
/* Bola de Natal pendurada (balanço lento)                              */
/* ------------------------------------------------------------------ */
const ORN = {
  red: ['#D63B45', '#B5222D', '#6E141B'],
  gold: ['#F3D98B', '#C5A059', '#7A5C17'],
  green: ['#3F8A63', '#204D38', '#0F2A1E'],
} as const;

export function Ornament({ color = 'red', size = 44, string = 60, delay = 0, className, style }: {
  color?: keyof typeof ORN; size?: number; string?: number; delay?: number; className?: string; style?: React.CSSProperties;
}) {
  const [hi, mid, lo] = ORN[color];
  const id = `orn-${color}`;
  return (
    <div aria-hidden="true" className={`ornament-swing pointer-events-none absolute top-0 ${className ?? ''}`} style={{ animationDelay: `${delay}s`, ...style }}>
      <svg width={size} height={string + size + 10} viewBox={`0 0 44 ${string + 54}`} overflow="visible">
        <defs>
          <radialGradient id={id} cx="35%" cy="30%" r="75%">
            <stop offset="0" stopColor={hi} /><stop offset=".55" stopColor={mid} /><stop offset="1" stopColor={lo} />
          </radialGradient>
        </defs>
        <line x1="22" y1="0" x2="22" y2={string} stroke="#C5A059" strokeWidth="1.2" />
        <rect x="16" y={string} width="12" height="8" rx="2" fill="#C5A059" />
        <rect x="16" y={string} width="12" height="2.5" fill="#F3D98B" />
        <circle cx="22" cy={string + 30} r="21" fill={`url(#${id})`} />
        <path d={`M5 ${string + 26} Q22 ${string + 34} 39 ${string + 26}`} stroke="#F3D98B" strokeWidth="1.5" fill="none" opacity=".75" />
        <ellipse cx="15" cy={string + 21} rx="5" ry="7" fill="#fff" opacity=".35" transform={`rotate(-25 15 ${string + 21})`} />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Guirlanda horizontal: faixa de pinheiro contínua com bolinhas         */
/* ------------------------------------------------------------------ */
function garlandTile(): string {
  const needles: string[] = [];
  for (let i = 0; i < 18; i++) {
    const x = i * 14 + 2;
    const len = 20 + ((i * 7) % 9);
    const c = i % 3 === 0 ? '#2E6A4C' : i % 3 === 1 ? '#204D38' : '#285C43';
    needles.push(`<path d="M${x} 30 l${len * 0.55} ${-len * 0.8}" stroke="${c}" stroke-width="3.2" stroke-linecap="round"/>`);
    needles.push(`<path d="M${x} 30 l${len * 0.6} ${len * 0.7}" stroke="${c}" stroke-width="3.2" stroke-linecap="round"/>`);
    needles.push(`<path d="M${x + 5} 30 l${len * 0.15} ${-len * 0.9}" stroke="#183B2B" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="252" height="62" viewBox="0 0 252 62"><path d="M-4 30 H256" stroke="#5B3A29" stroke-width="3"/>${needles.join('')}<g><circle cx="60" cy="40" r="7" fill="#B5222D"/><circle cx="58" cy="38" r="2" fill="#fff" opacity=".45"/><circle cx="150" cy="22" r="6" fill="#C5A059"/><circle cx="148" cy="20" r="1.8" fill="#fff" opacity=".5"/><circle cx="210" cy="42" r="5.5" fill="#B5222D"/><circle cx="104" cy="44" r="4" fill="#EABF35"/></g></svg>`;
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
}
const GARLAND = typeof window === 'undefined' ? '' : garlandTile();

export function Garland({ className, withLights = true }: { className?: string; withLights?: boolean }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none relative h-[62px] w-full ${className ?? ''}`}>
      <div className="absolute inset-0" style={{ backgroundImage: GARLAND, backgroundRepeat: 'repeat-x', backgroundSize: '252px 62px', filter: 'drop-shadow(0 6px 6px rgb(0 0 0 / .25))' }} />
      {withLights && (
        <div className="absolute inset-x-0 top-[22px] flex justify-around px-6">
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} className={`light-bulb h-2.5 w-2.5 rounded-full ${i > 9 ? 'hidden md:block' : i > 6 ? 'hidden sm:block' : ''}`}
              style={{ background: ['#FFE08A', '#FF8A80', '#FFE08A', '#B9F6CA'][i % 4], boxShadow: `0 0 10px 3px ${['#FFD54F', '#FF5252', '#FFD54F', '#69F0AE'][i % 4]}88`, animationDelay: `${(i % 5) * 0.9}s` }} />
          ))}
        </div>
      )}
    </div>
  );
}
