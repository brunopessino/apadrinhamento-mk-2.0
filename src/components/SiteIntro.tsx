/**
 * Abertura do site: o Papai Noel sobe em espiral ao redor da árvore,
 * acendendo as luzes; ao chegar ao topo a estrela brilha e um clarão
 * dourado revela a página. ~4 s, pode ser pulada (botão ou Esc).
 * Não é exibida com prefers-reduced-motion nem quando desativada
 * (localStorage "mk-skip-intro" = "1", usado nos testes automáticos).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/hooks/useReducedMotion';

const CLIMB_MS = 2600;
const STAR_MS = 550;
const FLASH_MS = 520;
const FADE_MS = 650;

const TOP_Y = 98, BASE_Y = 318, CX = 150;
const half = (y: number) => 14 + (y - 84) * 0.44;
const TURNS = 3.25;

function spiral(t: number) {
  const y = BASE_Y - t * (BASE_Y - TOP_Y);
  const a = t * TURNS * Math.PI * 2;
  const r = half(y) * 0.96;
  return { x: CX + r * Math.sin(a), y, depth: Math.cos(a) };
}

export function shouldShowIntro(pathname: string): boolean {
  if (pathname.startsWith('/admin')) return false;
  if (prefersReducedMotion()) return false;
  try { if (localStorage.getItem('mk-skip-intro') === '1') return false; } catch { /* */ }
  return true;
}

function Santa({ x, y, s, flip }: { x: number; y: number; s: number; flip: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <ellipse cx="0" cy="14" rx="9" ry="3" fill="#000" opacity=".25" />
      {/* saco de presentes */}
      <path d="M-13 2 q-6 -10 2 -14 q8 0 6 12z" fill="#7A5C17" />
      {/* corpo */}
      <path d="M-8 12 q-2 -14 8 -16 q10 2 8 16z" fill="#C42A35" />
      <rect x="-8.5" y="5" width="17" height="3" rx="1.5" fill="#242424" />
      <rect x="-1.5" y="5" width="3" height="3" fill="#EABF35" />
      {/* rosto, barba e gorro */}
      <circle cx="0" cy="-7" r="5" fill="#F6C9A8" />
      <path d="M-5.5 -6 q5.5 11 11 0 q-1 5 -5.5 6 q-4.5 -1 -5.5 -6z" fill="#FFFDF8" />
      <path d="M-5.5 -9 q2 -9 11 -6 l4 6 z" fill="#C42A35" />
      <rect x="-6.5" y="-10.5" width="13" height="3" rx="1.5" fill="#FFFDF8" />
      <circle cx="9.5" cy="-9" r="2.2" fill="#FFFDF8" />
      <circle cx="-1.8" cy="-7.5" r=".8" fill="#3E1418" /><circle cx="1.8" cy="-7.5" r=".8" fill="#3E1418" />
    </g>
  );
}

export function SiteIntro({ onDone }: { onDone?: () => void }) {
  const [t, setT] = useState(0);
  const [stage, setStage] = useState<'climb' | 'star' | 'flash' | 'fade' | 'done'>('climb');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const raf = useRef(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const finish = useCallback(() => {
    cancelAnimationFrame(raf.current);
    timers.current.forEach(clearTimeout); timers.current = [];
    setStage('done');
    document.documentElement.style.overflow = '';
    doneRef.current?.();
  }, []);

  const skip = useCallback(() => {
    cancelAnimationFrame(raf.current);
    timers.current.forEach(clearTimeout); timers.current = [];
    setStage('fade');
    timers.current.push(setTimeout(finish, 350));
  }, [finish]);

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    const start = performance.now() + 250;
    const loop = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / CLIMB_MS));
      setT(p);
      if (p < 1) raf.current = requestAnimationFrame(loop);
      else {
        setStage('star');
        timers.current.push(setTimeout(() => setStage('flash'), STAR_MS));
        timers.current.push(setTimeout(() => setStage('fade'), STAR_MS + FLASH_MS));
        timers.current.push(setTimeout(finish, STAR_MS + FLASH_MS + FADE_MS));
      }
    };
    raf.current = requestAnimationFrame(loop);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') skip(); };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf.current);
      timers.current.forEach(clearTimeout); timers.current = [];
      window.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
    };
  }, [finish, skip]);

  const bulbs = useMemo(() => Array.from({ length: 34 }, (_, i) => {
    const bt = (i + 0.5) / 34;
    return { bt, ...spiral(bt), color: ['#FFE08A', '#FF6B6B', '#B9F6CA', '#FFD54F'][i % 4] };
  }), []);
  const garland = useMemo(() => {
    const pts = Array.from({ length: 240 }, (_, i) => spiral(i / 239));
    // apenas trechos da frente (depth > 0)
    const segs: string[] = []; let cur = '';
    pts.forEach((p) => { if (p.depth > 0) cur += `${cur ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)} `; else if (cur) { segs.push(cur); cur = ''; } });
    if (cur) segs.push(cur);
    return segs;
  }, []);

  if (stage === 'done') return null;
  const santa = spiral(t);
  const next = spiral(Math.min(1, t + 0.005));
  const sScale = 1.35 + 0.3 * santa.depth;
  const santaEl = <Santa x={santa.x} y={santa.y - 10} s={sScale} flip={next.x < santa.x} />;
  const lit = (bt: number) => stage !== 'climb' || t >= bt;
  const starOn = stage !== 'climb';

  return (
    <div
      className="bg-velvet fixed inset-0 z-[100] grid place-items-center"
      style={{ opacity: stage === 'fade' ? 0 : 1, transition: `opacity ${FADE_MS}ms ease` }}
      data-testid="site-intro" data-stage={stage}
    >
      <div className="relative flex w-full max-w-sm flex-col items-center px-6">
        <svg aria-hidden="true" viewBox="0 30 300 330" className="w-[min(80vw,440px,52vh)] overflow-visible">
          <defs>
            <radialGradient id="intro-star-glow"><stop offset="0" stopColor="#FFF6D0" /><stop offset=".4" stopColor="#EABF35" stopOpacity=".8" /><stop offset="1" stopColor="#EABF35" stopOpacity="0" /></radialGradient>
            <linearGradient id="intro-tree" x1="0" x2="1"><stop offset="0" stopColor="#2E6A4C" /><stop offset=".55" stopColor="#204D38" /><stop offset="1" stopColor="#163828" /></linearGradient>
          </defs>
          {/* Papai Noel atrás da árvore */}
          {santa.depth <= 0 && stage === 'climb' && <g opacity=".85">{santaEl}</g>}
          {/* árvore */}
          <rect x="138" y="318" width="24" height="26" rx="3" fill="#5B3A29" />
          {[0, 1, 2, 3].map((k) => {
            const y0 = 84 + k * 52, y1 = y0 + 96;
            return <path key={k} d={`M${CX} ${y0} L${CX + half(y1)} ${Math.min(y1, 322)} Q${CX} ${Math.min(y1, 322) + 10} ${CX - half(y1)} ${Math.min(y1, 322)} Z`} fill="url(#intro-tree)" />;
          })}
          {/* guirlanda e luzes acendendo */}
          {garland.map((d, i) => <path key={i} d={d} stroke="#C5A059" strokeWidth="1.6" fill="none" opacity=".55" />)}
          {bulbs.filter((b) => b.depth > 0).map((b, i) => (
            <circle key={i} cx={b.x} cy={b.y} r={lit(b.bt) ? 3.6 : 2.4} fill={lit(b.bt) ? b.color : '#3E4A3F'}
              style={{ filter: lit(b.bt) ? `drop-shadow(0 0 5px ${b.color})` : 'none', transition: 'r .25s, fill .25s' }} />
          ))}
          {/* Papai Noel na frente */}
          {santa.depth > 0 && stage === 'climb' && santaEl}
          {/* estrela */}
          <g transform={`translate(${CX} 76)`}>
            <circle r="46" fill="url(#intro-star-glow)" style={{ opacity: starOn ? 1 : 0, transform: `scale(${starOn ? 1.25 : 0.3})`, transition: 'opacity .4s, transform .55s cubic-bezier(.34,1.56,.64,1)' }} />
            <path d="M0 -17 L5 -5.5 L17.5 -5 L7.8 3 L11 15.5 L0 8.6 L-11 15.5 L-7.8 3 L-17.5 -5 L-5 -5.5 Z"
              fill={starOn ? '#FFE08A' : '#8A7A45'} stroke="#C5A059" strokeWidth="1.2"
              style={{ transform: `scale(${starOn ? 1.2 : 0.9})`, transition: 'transform .5s cubic-bezier(.34,1.56,.64,1), fill .3s' }} />
          </g>
          {/* presentes */}
          <g transform="translate(92 330)"><rect width="26" height="20" rx="2" fill="#B5222D" /><rect x="11" width="4" height="20" fill="#EABF35" /></g>
          <g transform="translate(176 334)"><rect width="30" height="16" rx="2" fill="#C5A059" /><rect x="13" width="4" height="16" fill="#B5222D" /></g>
        </svg>
        <p aria-hidden="true" className="text-script gold-text -mt-1 text-center text-4xl" style={{ opacity: t > 0.15 ? 1 : 0, transition: 'opacity .8s' }}>Meu Kantinho</p>
        <p aria-hidden="true" className="mt-1 text-center text-xs font-bold uppercase tracking-[0.3em] text-cream/80" style={{ opacity: t > 0.3 ? 1 : 0, transition: 'opacity .8s' }}>Natal 2026</p>
      </div>
      {/* clarão que nasce da estrela */}
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 rounded-full"
        style={{
          marginLeft: -80, marginTop: 'calc(-80px - min(19vw, 84px))',
          background: 'radial-gradient(circle, #FFFBEA 0%, #FFE9A8 45%, rgba(234,191,53,0) 70%)',
          transform: `scale(${stage === 'flash' || stage === 'fade' ? 26 : 0})`, opacity: stage === 'flash' || stage === 'fade' ? 1 : 0,
          transition: `transform ${FLASH_MS}ms cubic-bezier(.4,0,.2,1), opacity 200ms`,
        }} />
      <button type="button" onClick={skip} className="absolute bottom-6 right-6 rounded-full border border-cream/30 px-4 py-2 text-sm font-semibold text-cream/85 hover:bg-cream/10" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
        Pular abertura
      </button>
    </div>
  );
}
