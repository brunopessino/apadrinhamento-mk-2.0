/**
 * Espetáculo em tela cheia da confirmação: fundo de veludo, raios dourados,
 * presente gigante que treme e explode, canhões de confete, fogos de artifício,
 * "Apadrinhado!" em letra dourada e um sininho de Natal (Web Audio, volume baixo).
 * Renderizado em um <dialog> próprio para ficar acima do modal de apadrinhamento.
 * Só aparece no modo animado (nunca com prefers-reduced-motion).
 */
import { useEffect, useRef } from 'react';
import { GiftBoxArt } from './decor/Decor';
import type { CelebrationStage } from './ChristmasCelebration';

const COLORS = ['#D63B45', '#B5222D', '#F3D98B', '#EABF35', '#C5A059', '#2E6A4C', '#3F8A63', '#FFFFFF'];
const FW = [['#FFE08A', '#EABF35', '#FFF6D0'], ['#FF6B6B', '#D63B45', '#FFD1D1'], ['#7EE2A8', '#3F8A63', '#E6FFF0'], ['#FFFFFF', '#F3D98B', '#FFE9A8']];

type Bit = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; w: number; h: number; c: string; shape: 0 | 1 | 2; life: number; max: number; spark: boolean; tilt: number };
type Rocket = { x: number; y: number; vy: number; ty: number; pal: string[] };

function budget() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const weak = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 2;
  return weak ? 0.5 : window.innerWidth < 480 ? 0.75 : 1;
}

/** "Jingle Bells" curtinho com timbre de sino (sintetizado, sem arquivos). */
function playJingle() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return () => {};
    const ctx = new Ctx();
    void ctx.resume?.();
    const master = ctx.createGain(); master.gain.value = 0.16; master.connect(ctx.destination);
    const E = 659.25, G = 783.99, C = 523.25, D = 587.33;
    const notes: [number, number][] = [[E, 0], [E, .18], [E, .36], [E, .66], [E, .84], [E, 1.02], [E, 1.32], [G, 1.5], [C, 1.68], [D, 1.86], [E, 2.04]];
    const t0 = ctx.currentTime + 0.05;
    for (const [f, at] of notes) {
      for (const [mult, vol] of [[1, 1], [2.76, .25], [5.4, .08]] as const) {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f * mult;
        g.gain.setValueAtTime(0.0001, t0 + at);
        g.gain.exponentialRampToValueAtTime(vol, t0 + at + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + (at === 2.04 ? 1.4 : 0.5));
        o.connect(g); g.connect(master); o.start(t0 + at); o.stop(t0 + at + 1.5);
      }
    }
    const t = setTimeout(() => void ctx.close(), 4200);
    return () => { clearTimeout(t); void ctx.close(); };
  } catch { return () => {}; }
}

export function CelebrationShow({ stage, name, onSkip }: { stage: CelebrationStage; name?: string; onSkip: () => void }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef(stage);
  stageRef.current = stage;

  // abre acima de qualquer outro modal
  useEffect(() => {
    const d = dlg.current;
    if (d && !d.open) { try { if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', ''); } catch { d.setAttribute('open', ''); } }
    return () => { if (d?.open) { if (typeof d.close === 'function') d.close(); else d.removeAttribute('open'); } };
  }, []);

  // som + vibração na explosão do presente
  const opened = stage === 'open';
  useEffect(() => {
    if (!opened) return;
    try { navigator.vibrate?.([60, 40, 60, 40, 160]); } catch { /* */ }
    return playJingle();
  }, [opened]);

  // confete e fogos em canvas
  useEffect(() => {
    const cv = canvas.current; const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    const resize = () => { W = window.innerWidth; H = window.innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize(); window.addEventListener('resize', resize);
    const k = budget();
    const bits: Bit[] = []; const rockets: Rocket[] = []; const booms: { x: number; y: number; t: number }[] = [];
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const confetti = (x: number, y: number, n: number, ang: number, spread: number, speed: [number, number]) => {
      for (let i = 0; i < n * k; i++) {
        const a = ang + rnd(-spread, spread); const s = rnd(...speed);
        bits.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, rot: rnd(0, 6.28), vr: rnd(-0.3, 0.3), w: rnd(6, 12), h: rnd(4, 8), c: COLORS[(Math.random() * COLORS.length) | 0], shape: (Math.random() < 0.15 ? 2 : Math.random() < 0.3 ? 1 : 0) as 0 | 1 | 2, life: 0, max: rnd(220, 320), spark: false, tilt: rnd(0, 6.28) });
      }
    };
    const explode = (x: number, y: number, pal: string[]) => {
      const n = Math.round(95 * k);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.283 + rnd(-0.05, 0.05); const s = rnd(3, 8.5);
        bits.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, rot: 0, vr: 0, w: rnd(2.4, 3.8), h: 0, c: pal[i % pal.length], shape: 1, life: 0, max: rnd(65, 95), spark: true, tilt: 0 });
      }
    };
    const fire = () => rockets.push({ x: rnd(W * 0.15, W * 0.85), y: H + 10, vy: -rnd(11, 14), ty: rnd(H * 0.12, H * 0.4), pal: FW[(Math.random() * FW.length) | 0] });

    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    // o presente explode em ~1,0 s após a montagem do espetáculo (estágio "open")
    at(1000, () => confetti(W / 2, H * 0.5, 160, -Math.PI / 2, 1.3, [7, 16]));
    at(1150, () => { confetti(0, H * 0.75, 110, -Math.PI / 3, 0.35, [12, 20]); confetti(W, H * 0.75, 110, -2 * Math.PI / 3, 0.35, [12, 20]); });
    [1500, 1900, 2250, 2600, 2950, 3300, 3700].forEach((t) => at(t, fire));
    at(2400, () => { confetti(0, H * 0.6, 70, -Math.PI / 4, 0.4, [10, 17]); confetti(W, H * 0.6, 70, -3 * Math.PI / 4, 0.4, [10, 17]); });
    const rain = setInterval(() => { if (stageRef.current === 'reveal') for (let i = 0; i < 4 * k; i++) bits.push({ x: rnd(0, W), y: -10, vx: rnd(-1, 1), vy: rnd(1, 3), rot: rnd(0, 6.28), vr: rnd(-0.2, 0.2), w: rnd(6, 11), h: rnd(4, 7), c: COLORS[(Math.random() * COLORS.length) | 0], shape: 0, life: 0, max: 400, spark: false, tilt: rnd(0, 6.28) }); }, 60);

    let raf = 0; let last = performance.now();
    const star = (r: number) => { ctx.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r; const a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); };
    const loop = (now: number) => {
      const dt = Math.min(2.5, (now - last) / 16.67); last = now;
      ctx.clearRect(0, 0, W, H);
      // clarão de cada explosão
      for (let i = booms.length - 1; i >= 0; i--) {
        const bm = booms[i]; bm.t += dt; if (bm.t > 18) { booms.splice(i, 1); continue; }
        const g = ctx.createRadialGradient(bm.x, bm.y, 0, bm.x, bm.y, 140);
        g.addColorStop(0, `rgba(255,240,200,${0.55 * (1 - bm.t / 18)})`); g.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(bm.x - 140, bm.y - 140, 280, 280);
      }
      // foguetes
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i]; r.y += r.vy * dt; r.vy *= 0.985;
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#FFE9A8';
        ctx.beginPath(); ctx.arc(r.x, r.y, 2.4, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(255,220,140,.35)'; ctx.fillRect(r.x - 1, r.y, 2, 22);
        if (r.y <= r.ty || r.vy > -2) { explode(r.x, r.y, r.pal); booms.push({ x: r.x, y: r.y, t: 0 }); rockets.splice(i, 1); }
      }
      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i]; b.life += dt;
        if (b.spark) { b.vx *= 0.96; b.vy = b.vy * 0.96 + 0.06 * dt; }
        else { b.vx *= 0.985; b.vy = Math.min(b.vy * 0.985 + 0.22 * dt, 4.5); b.vx += Math.sin((b.tilt += 0.08 * dt)) * 0.12; }
        b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt;
        if (b.life > b.max || b.y > H + 30) { bits.splice(i, 1); continue; }
        const fade = b.spark ? 1 - b.life / b.max : Math.min(1, (b.max - b.life) / 40);
        ctx.globalAlpha = Math.max(0, fade);
        if (b.spark) {
          ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = b.c;
          ctx.beginPath(); ctx.arc(b.x, b.y, b.w, 0, 6.283); ctx.fill();
          ctx.globalAlpha *= 0.35; ctx.beginPath(); ctx.arc(b.x - b.vx * 2, b.y - b.vy * 2, b.w * 0.8, 0, 6.283); ctx.fill();
        } else {
          ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = b.c;
          ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot);
          if (b.shape === 2) star(b.w * 0.8);
          else if (b.shape === 1) { ctx.beginPath(); ctx.arc(0, 0, b.w * 0.4, 0, 6.283); ctx.fill(); }
          else { ctx.scale(1, Math.cos(b.tilt)); ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); }
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); timers.forEach(clearTimeout); clearInterval(rain); window.removeEventListener('resize', resize); bits.length = 0; rockets.length = 0; };
  }, []);

  return (
    <dialog ref={dlg} className="cc-show" data-stage={stage} data-testid="celebration-show" aria-label="Celebração do apadrinhamento"
      onCancel={(e) => { e.preventDefault(); onSkip(); }}>
      <div className="cc-show-bg" />
      <div className="cc-show-rays" />
      <div className="cc-show-flash" />
      <canvas ref={canvas} className="cc-show-canvas" aria-hidden="true" />
      <div className="cc-show-stage">
        <div className="cc-root cc-big" data-stage={stage} aria-hidden="true"><GiftBoxArt withCheck={false} /></div>
        <div className="cc-show-text">
          <p className="cc-show-title text-script gold-text">Apadrinhado!</p>
          {name && <p className="cc-show-sub">{name} vai ter um Natal ainda mais feliz</p>}
          <p className="cc-show-thanks">Obrigado por espalhar amor neste Natal 🎄</p>
        </div>
      </div>
      <button type="button" onClick={onSkip} className="cc-show-skip">Pular animação</button>
    </dialog>
  );
}
