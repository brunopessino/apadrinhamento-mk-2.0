/**
 * ChristmasCelebration — animação comemorativa exclusiva da confirmação.
 *
 * - Montado somente pelo painel de sucesso, que só existe após resposta
 *   positiva do servidor (a animação não decide nada sobre persistência).
 * - Executa no máximo uma vez por chave (protocolo).
 * - Limpa todos os temporizadores e partículas ao terminar/desmontar.
 * - Respeita prefers-reduced-motion com versão estática equivalente.
 * - Falhas aqui são isoladas por CelebrationBoundary.
 */
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { GiftBoxArt, MusicNote, Snowflake, Sparkle, Star } from './decor/Decor';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export type CelebrationStage = 'enter' | 'shake' | 'open' | 'reveal' | 'fade' | 'done';

/** Linha do tempo em ms (≈3,2 s no total). */
export const TIMELINE: [CelebrationStage, number][] = [
  ['enter', 0],
  ['shake', 650],
  ['open', 1100],
  ['reveal', 1850],
  ['fade', 2600],
  ['done', 3200],
];

const played = new Set<string>();
/** Somente testes */
export const __resetPlayed = () => played.clear();

function particleBudget(): number {
  if (typeof window === 'undefined') return 18;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const weak = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 2;
  const small = window.innerWidth < 480;
  return weak ? 14 : small ? 22 : 34;
}

type Kind = 'star' | 'sparkle' | 'note' | 'snow' | 'confetti';
interface Particle { id: number; kind: Kind; color: string; tx: number; ty: number; r: number; s: number; d: number; delay: number; size: number }

function makeParticles(n: number): Particle[] {
  const kinds: Kind[] = ['confetti', 'confetti', 'star', 'sparkle', 'note', 'snow', 'confetti'];
  const colors = ['#B5222D', '#204D38', '#C5A059', '#EABF35', '#B5222D', '#2E6A4C'];
  return Array.from({ length: n }, (_, i) => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;
    const dist = 80 + Math.random() * 120;
    const kind = kinds[i % kinds.length];
    return {
      id: i, kind, color: kind === 'snow' ? '#FFFFFF' : kind === 'note' ? '#70252B' : colors[i % colors.length],
      tx: Math.cos(angle) * dist, ty: Math.sin(angle) * dist + (kind === 'confetti' ? 40 : 0),
      r: (Math.random() - 0.5) * 540, s: 0.7 + Math.random() * 0.6, d: 1.2 + Math.random() * 0.8, delay: Math.random() * 0.25,
      size: kind === 'confetti' ? 8 : kind === 'note' ? 16 : 12,
    };
  });
}

function ParticleShape({ p }: { p: Particle }) {
  const style = {
    '--tx': `${p.tx}px`, '--ty': `${p.ty}px`, '--r': `${p.r}deg`, '--s': p.s, '--d': `${p.d}s`, '--delay': `${p.delay}s`,
    color: p.color, width: p.size, height: p.kind === 'confetti' ? p.size * 0.55 : p.size,
  } as React.CSSProperties;
  if (p.kind === 'confetti') return <span className="cc-particle rounded-[2px]" style={{ ...style, background: p.color }} />;
  const Icon = p.kind === 'star' ? Star : p.kind === 'sparkle' ? Sparkle : p.kind === 'note' ? MusicNote : Snowflake;
  return <span className="cc-particle" style={style}><Icon className="h-full w-full" style={p.kind === 'snow' ? { filter: 'drop-shadow(0 0 1px #C5A059)' } : undefined} /></span>;
}

export interface ChristmasCelebrationProps {
  /** Chave única da confirmação (protocolo) — evita execução duplicada. */
  playKey: string;
  onDone?: () => void;
  /** força modo (testes) */
  forceReducedMotion?: boolean;
}

export function ChristmasCelebration({ playKey, onDone, forceReducedMotion }: ChristmasCelebrationProps) {
  const systemReduced = useReducedMotion();
  const reduced = forceReducedMotion ?? systemReduced;
  // Decidido uma única vez por montagem: evita reexecução e chamadas duplicadas.
  const [animated] = useState(() => !reduced && !played.has(playKey));
  const [stage, setStage] = useState<CelebrationStage>(animated ? 'enter' : 'done');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const particles = useMemo(() => (animated ? makeParticles(particleBudget()) : []), [animated]);

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const finish = useCallback(() => {
    clear();
    played.add(playKey);
    setStage('done');
    doneRef.current?.();
  }, [playKey]);

  useEffect(() => {
    if (!animated) { played.add(playKey); doneRef.current?.(); return; }
    setStage('enter');
    for (const [s, at] of TIMELINE.slice(1)) {
      timers.current.push(setTimeout(() => (s === 'done' ? finish() : setStage(s)), at));
    }
    return clear;
  }, [animated, playKey, finish]);

  const showParticles = animated && (stage === 'open' || stage === 'reveal' || stage === 'fade');

  return (
    <div className="relative">
      <div className="cc-root" data-testid="celebration" data-stage={stage} data-mode={animated ? 'animated' : 'static'} aria-hidden="true">
        <GiftBoxArt open={!animated} />
        {showParticles && (
          <div className="cc-particles">
            {particles.map((p) => <ParticleShape key={p.id} p={p} />)}
          </div>
        )}
      </div>
      {animated && stage !== 'done' && (
        <button type="button" onClick={finish} className="absolute right-0 top-0 rounded-full bg-paper/80 px-3 py-1.5 text-xs font-semibold text-muted underline-offset-2 hover:underline">
          Pular animação
        </button>
      )}
    </div>
  );
}

/** Isola qualquer falha da animação; a confirmação continua visível. */
export class CelebrationBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { /* falha visual não afeta a confirmação */ }
  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}
