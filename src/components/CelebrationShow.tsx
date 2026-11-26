/**
 * Celebração em tela cheia da confirmação — "noite de Natal": céu estrelado com lua,
 * neve caindo, o presente se abre soltando luz, estrelas e flocos, e o trenó do
 * Papai Noel cruza o céu deixando um rastro de brilho. Sininho suave (Web Audio).
 * Renderizado em um <dialog> próprio para ficar acima do modal de apadrinhamento.
 * Só aparece no modo animado (nunca com prefers-reduced-motion).
 */
import { useEffect, useRef } from 'react';
import { GiftBoxArt } from './decor/Decor';
import type { CelebrationStage } from './ChristmasCelebration';


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
    const master = ctx.createGain(); master.gain.value = 0.09; master.connect(ctx.destination);
    const E = 659.25, G = 783.99, C = 523.25, D = 587.33;
    const notes: [number, number][] = [[E, 0], [E, .24], [E, .48], [E, .88], [E, 1.12], [E, 1.36], [E, 1.76], [G, 2], [C, 2.24], [D, 2.48], [E, 2.72]];
    const t0 = ctx.currentTime + 0.05;
    for (const [f, at] of notes) {
      for (const [mult, vol] of [[1, 1], [2.76, .25], [5.4, .08]] as const) {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f * mult;
        g.gain.setValueAtTime(0.0001, t0 + at);
        g.gain.exponentialRampToValueAtTime(vol, t0 + at + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + (at === 2.72 ? 1.8 : 0.7));
        o.connect(g); g.connect(master); o.start(t0 + at); o.stop(t0 + at + 1.5);
      }
    }
    const t = setTimeout(() => void ctx.close(), 5200);
    return () => { clearTimeout(t); void ctx.close(); };
  } catch { return () => {}; }
}

export function CelebrationShow({ stage, name, onSkip }: { stage: CelebrationStage; name?: string; onSkip: () => void }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const sleigh = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const d = dlg.current;
    if (d && !d.open) { try { if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', ''); } catch { d.setAttribute('open', ''); } }
    return () => { if (d?.open) { if (typeof d.close === 'function') d.close(); else d.removeAttribute('open'); } };
  }, []);

  const opened = stage === 'open';
  useEffect(() => (opened ? playJingle() : undefined), [opened]);

  useEffect(() => {
    const cv = canvas.current; const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    const resize = () => { W = window.innerWidth; H = window.innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize(); window.addEventListener('resize', resize);
    const k = budget();
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; kind: 0 | 1 | 2; life: number; max: number; ph: number; c: string };
    // 0 = floco de neve, 1 = estrela dourada, 2 = brilho do rastro
    const ps: P[] = [];
    const stars = Array.from({ length: Math.round(110 * k) }, () => ({ x: Math.random(), y: Math.random() * 0.6, r: rnd(0.4, 1.4), ph: rnd(0, 6.28) }));
    const snow = (n: number, top = false) => { for (let i = 0; i < n; i++) ps.push({ x: rnd(0, W), y: top ? rnd(-H, 0) : rnd(0, H), vx: rnd(-0.3, 0.3), vy: rnd(0.4, 1.3), r: rnd(1, 3.2), a: rnd(0.4, 0.9), kind: 0, life: 0, max: 1e9, ph: rnd(0, 6.28), c: '#FFFFFF' }); };
    snow(Math.round(90 * k));
    const t0 = performance.now();
    let burst = false;
    let raf = 0; let last = t0;
    const drawStar = (x: number, y: number, r: number) => { ctx.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.42 : r; const a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); };
    const loop = (now: number) => {
      const t = now - t0; const dt = Math.min(2.5, (now - last) / 16.67); last = now;
      ctx.clearRect(0, 0, W, H);
      // estrelas do céu piscando
      for (const s of stars) { ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(s.ph + t / 700)); ctx.fillStyle = '#FFF8EC'; ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, 6.283); ctx.fill(); }
      // o presente se abre: sobem estrelas douradas e flocos
      if (!burst && t > 1000) {
        burst = true;
        const cx = W / 2, cy = H * 0.46;
        for (let i = 0; i < 120 * k; i++) {
          const a = -Math.PI / 2 + rnd(-0.9, 0.9); const sp = rnd(2, 7.5);
          const gold = Math.random() < 0.6;
          ps.push({ x: cx + rnd(-30, 30), y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: gold ? rnd(3, 7) : rnd(2, 4), a: 1, kind: gold ? 1 : 0, life: 0, max: rnd(120, 200), ph: rnd(0, 6.28), c: gold ? ['#FFE08A', '#F3D98B', '#FFF6D0'][i % 3] : '#FFFFFF' });
        }
        snow(Math.round(60 * k), true);
      }
      // trenó do Papai Noel cruzando o céu (1,4 s a 4,4 s)
      const sp = (t - 1400) / 3000;
      if (sleigh.current) {
        if (sp > 0 && sp < 1) {
          const x = -0.15 * W + sp * 1.3 * W; const y = H * 0.2 - Math.sin(Math.PI * sp) * H * 0.09;
          const sc = Math.max(0.85, Math.min(1.3, W / 650));
          sleigh.current.style.opacity = '1';
          sleigh.current.style.transform = `translate(${x - 110 * sc}px, ${y - 30 * sc}px) scale(${sc}) rotate(${-8 * Math.cos(Math.PI * sp)}deg)`;
          for (let i = 0; i < 3 * k; i++) ps.push({ x: x - 100 * sc + rnd(-6, 6), y: y + 10 * sc + rnd(-6, 6), vx: rnd(-0.6, 0.2), vy: rnd(0.2, 0.9), r: rnd(1, 2.6), a: 1, kind: 2, life: 0, max: rnd(50, 90), ph: 0, c: ['#FFE9A8', '#FFFFFF', '#F3D98B'][i % 3] });
        } else sleigh.current.style.opacity = '0';
      }
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i]; p.life += dt;
        if (p.kind === 0) { p.ph += 0.02 * dt; p.x += (p.vx + Math.sin(p.ph) * 0.4) * dt; p.vy = Math.min(p.vy + 0.03 * dt, 1.6); p.y += p.vy * dt; if (p.y > H + 5) { if (p.max > 1e8) { p.y = -5; p.x = rnd(0, W); } else { ps.splice(i, 1); continue; } } }
        else { p.vx *= 0.97; p.vy = p.vy * 0.97 + 0.05 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.life > p.max) { ps.splice(i, 1); continue; } }
        const fade = p.kind === 0 ? p.a : Math.max(0, 1 - p.life / p.max);
        ctx.globalAlpha = fade; ctx.fillStyle = p.c;
        if (p.kind === 1) { ctx.shadowColor = '#FFD66B'; ctx.shadowBlur = 10; drawStar(p.x, p.y, p.r); ctx.shadowBlur = 0; }
        else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); ps.length = 0; };
  }, []);

  return (
    <dialog ref={dlg} className="cc-show" data-stage={stage} data-testid="celebration-show" aria-label="Celebração do apadrinhamento"
      onCancel={(e) => { e.preventDefault(); onSkip(); }}>
      <div className="cc-show-bg" />
      <div className="cc-show-moon" />
      <canvas ref={canvas} className="cc-show-canvas" aria-hidden="true" />
      <svg ref={sleigh} className="cc-show-sleigh" viewBox="0 0 220 70" width="220" height="70" aria-hidden="true">
        <g fill="#F6E7BF">
          {/* renas */}
          {[0, 46].map((dx) => (
            <g key={dx} transform={`translate(${dx} 0)`}>
              <path d="M14 34 q6 -6 18 -5 q6 -6 9 -14 l2 1 q-2 6 -5 11 l5 1 q-2 4 -6 4 q-1 6 -7 8 l3 12 h-3 l-4 -10 l-6 0 l-3 10 h-3 l2 -12 q-4 -2 -2 -6z" />
              <path d="M41 14 l-3 -7 m3 7 l4 -6 m-6 1 l-3 -2" stroke="#F6E7BF" strokeWidth="1.6" fill="none" />
            </g>
          ))}
          <path d="M34 36 L104 34 M80 36 L120 34" stroke="#F6E7BF" strokeWidth="1" fill="none" opacity=".8" />
          {/* trenó + Papai Noel + saco */}
          <path d="M118 30 q3 -14 16 -15 q6 -10 14 -6 q6 2 4 9 q10 -8 22 -2 q6 4 4 12 l14 0 q2 10 -10 14 l-56 0 q-10 0 -8 -12z" />
          <path d="M112 56 h80 q10 0 12 -8" stroke="#F6E7BF" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M126 48 v8 M180 48 v8" stroke="#F6E7BF" strokeWidth="2" />
        </g>
      </svg>
      <div className="cc-show-stage">
        <div className="cc-root cc-big" data-stage={stage} aria-hidden="true"><GiftBoxArt withCheck={false} /></div>
        <div className="cc-show-text">
          <p className="cc-show-title text-script">Apadrinhado!</p>
          {name && <p className="cc-show-sub">{name} vai ter um Natal ainda mais feliz</p>}
          <p className="cc-show-thanks">Obrigado por espalhar amor neste Natal</p>
        </div>
      </div>
      <button type="button" onClick={onSkip} className="cc-show-skip">Pular animação</button>
    </dialog>
  );
}
