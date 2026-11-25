/** Elementos natalinos vetoriais próprios (sem imagens de terceiros). Todos decorativos: aria-hidden. */
import type { SVGProps } from 'react';
import { INSTITUTION } from '@/config/campaign';

type P = SVGProps<SVGSVGElement>;

export function Star({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} {...p}>
      <path d="M12 1.8l2.6 6.6 7 .5-5.4 4.5 1.7 6.9L12 16.5l-5.9 3.8 1.7-6.9L2.4 8.9l7-.5z" fill="currentColor" />
    </svg>
  );
}

export function Sparkle({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} {...p}>
      <path d="M12 0c.6 6.4 5.6 11.4 12 12-6.4.6-11.4 5.6-12 12-.6-6.4-5.6-11.4-12-12C6.4 11.4 11.4 6.4 12 0z" fill="currentColor" />
    </svg>
  );
}

export function MusicNote({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} {...p}>
      <path d="M9 17.5V5.2l11-2.7v12.3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="6.4" cy="17.6" rx="3" ry="2.3" fill="currentColor" />
      <ellipse cx="17.4" cy="14.9" rx="3" ry="2.3" fill="currentColor" />
    </svg>
  );
}

export function Snowflake({ className, ...p }: P) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} {...p}>
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7" />
        <path d="M9.5 3.8L12 6l2.5-2.2M9.5 20.2L12 18l2.5 2.2" />
      </g>
    </svg>
  );
}

/** Ramo de pinheiro estilizado com frutinhas. */
export function PineBranch({ className, flip, ...p }: P & { flip?: boolean }) {
  const needles = Array.from({ length: 14 }, (_, i) => i);
  return (
    <svg viewBox="0 0 320 120" aria-hidden="true" className={className} style={flip ? { transform: 'scaleX(-1)' } : undefined} {...p}>
      <path d="M8 70 C 90 52, 190 48, 312 22" stroke="#5B3A29" strokeWidth="4" fill="none" strokeLinecap="round" />
      {needles.map((i) => {
        const t = i / 13;
        const x = 18 + t * 280;
        const y = 68 - t * 44 + Math.sin(t * 3) * 3;
        const len = 46 - t * 18;
        const shade = i % 2 ? '#204D38' : '#2E6A4C';
        return (
          <g key={i} stroke={shade} strokeWidth="3.2" strokeLinecap="round">
            <path d={`M${x} ${y} l${len * 0.35} ${-len * 0.62}`} />
            <path d={`M${x} ${y} l${len * 0.48} ${len * 0.5}`} />
            <path d={`M${x + 6} ${y - 2} l${len * 0.1} ${-len * 0.72}`} opacity=".8" />
            <path d={`M${x + 6} ${y} l${len * 0.25} ${len * 0.66}`} opacity=".8" />
          </g>
        );
      })}
      <g fill="#B5222D">
        <circle cx="118" cy="78" r="6" /><circle cx="130" cy="84" r="5" /><circle cx="124" cy="92" r="5.5" />
        <circle cx="236" cy="52" r="5" /><circle cx="246" cy="58" r="4.5" />
      </g>
      <g fill="#fff" opacity=".55"><circle cx="116" cy="76" r="1.6" /><circle cx="234" cy="50" r="1.4" /></g>
    </svg>
  );
}

/** Fita horizontal (largura total) com laço central — referência à arte da campanha. */
export function RibbonBow({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none ${className ?? ''}`}>
      <div className="absolute inset-x-0 top-[34%] h-[24%] bg-gradient-to-b from-[#C42A35] via-[#B5222D] to-[#8E1B24] shadow-[0_4px_10px_-4px_rgb(112_37_43/.45)]">
        <div className="mt-[3px] h-[3px] bg-white/20" />
      </div>
      <svg viewBox="160 0 280 140" className="absolute left-1/2 top-0 h-full -translate-x-1/2">
        <defs>
          <linearGradient id="rb-loop" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#D23A44" /><stop offset="1" stopColor="#8E1B24" />
          </linearGradient>
        </defs>
        <path d="M300 66 C 250 10, 170 8, 178 52 C 184 86, 252 86, 300 66Z" fill="url(#rb-loop)" />
        <path d="M300 66 C 350 10, 430 8, 422 52 C 416 86, 348 86, 300 66Z" fill="url(#rb-loop)" />
        <path d="M292 72 L 252 134 L 270 128 L 280 140 L 300 78Z" fill="#9C1C26" />
        <path d="M308 72 L 348 134 L 330 128 L 320 140 L 300 78Z" fill="#8E1B24" />
        <ellipse cx="300" cy="66" rx="20" ry="17" fill="#B5222D" />
        <ellipse cx="295" cy="61" rx="7" ry="4" fill="#fff" opacity=".22" />
      </svg>
    </div>
  );
}

/** Varal de luzes discretas (brilho lento, sem piscar). */
export function LightsString({ className, count = 11 }: { className?: string; count?: number }) {
  const colors = ['#EABF35', '#B5222D', '#2E6A4C', '#C5A059'];
  return (
    <svg viewBox="0 0 600 60" aria-hidden="true" preserveAspectRatio="none" className={className}>
      <path d="M0 10 Q 150 46 300 22 T 600 12" stroke="#5B4A3A" strokeWidth="1.5" fill="none" opacity=".55" />
      {Array.from({ length: count }, (_, i) => {
        const x = 20 + (i * 560) / (count - 1);
        const y = 10 + Math.sin((x / 600) * Math.PI * 2.1 + 0.4) * 12 + 14;
        return (
          <g key={i}>
            <circle cx={x} cy={y + 9} r="9" fill={colors[i % colors.length]} opacity=".18" className="light-bulb" style={{ animationDelay: `${(i % 5) * 0.8}s` }} />
            <rect x={x - 2.5} y={y} width="5" height="4" rx="1" fill="#5B4A3A" />
            <ellipse cx={x} cy={y + 9} rx="4" ry="5.5" fill={colors[i % colors.length]} className="light-bulb" style={{ animationDelay: `${(i % 5) * 0.8}s` }} />
          </g>
        );
      })}
    </svg>
  );
}

/** Caixa de presente usada na celebração (classes cc-* controlam o movimento). */
export function GiftBoxArt({ open = false, withCheck = true }: { open?: boolean; withCheck?: boolean }) {
  return (
    <svg viewBox="0 0 200 200" className="cc-box" aria-hidden="true">
      <defs>
        <radialGradient id="gb-glow" cx="50%" cy="100%" r="70%">
          <stop offset="0" stopColor="#FFE9A8" stopOpacity="1" />
          <stop offset=".5" stopColor="#EABF35" stopOpacity=".55" />
          <stop offset="1" stopColor="#EABF35" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gb-body" x1="0" x2="1">
          <stop offset="0" stopColor="#C42A35" /><stop offset="1" stopColor="#8E1B24" />
        </linearGradient>
        <linearGradient id="gb-gold" x1="0" x2="1">
          <stop offset="0" stopColor="#E6C77A" /><stop offset=".5" stopColor="#C5A059" /><stop offset="1" stopColor="#A9843E" />
        </linearGradient>
      </defs>
      <ellipse className="cc-glow" cx="100" cy="98" rx="78" ry="70" fill="url(#gb-glow)" style={open ? { opacity: 0.5, transform: 'scale(1)' } : undefined} />
      <ellipse cx="100" cy="184" rx="62" ry="7" fill="#242424" opacity=".12" />
      <rect x="40" y="98" width="120" height="84" rx="8" fill="url(#gb-body)" />
      <rect x="92" y="98" width="16" height="84" fill="url(#gb-gold)" />
      <rect x="40" y="98" width="120" height="8" fill="#000" opacity=".12" />
      <g className="cc-lid" style={open ? { transform: 'translate(-40px,-14px) rotate(-50deg)' } : undefined}>
        <rect x="32" y="74" width="136" height="28" rx="7" fill="#B5222D" />
        <rect x="32" y="74" width="136" height="6" rx="3" fill="#fff" opacity=".16" />
        <rect x="91" y="74" width="18" height="28" fill="url(#gb-gold)" />
        <g className="cc-bow">
          <path d="M100 74 C 78 44, 52 50, 60 66 C 66 78, 88 78, 100 74Z" fill="url(#gb-gold)" />
          <path d="M100 74 C 122 44, 148 50, 140 66 C 134 78, 112 78, 100 74Z" fill="url(#gb-gold)" />
          <circle cx="100" cy="73" r="8" fill="#A9843E" />
        </g>
      </g>
      {withCheck && (
        <g className="cc-check" style={open ? { opacity: 1, transform: 'none' } : undefined}>
          <circle cx="100" cy="60" r="24" fill="#204D38" stroke="#F9F6EF" strokeWidth="3" />
          <path d="M89 60 l8 8 l15 -16" fill="none" stroke="#F9F6EF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={open ? { strokeDashoffset: 0 } : undefined} />
        </g>
      )}
    </svg>
  );
}

/** Logotipo institucional autorizado (arquivo do projeto original). */
export function Logo({ className }: { className?: string }) {
  return <img src={INSTITUTION.logo} alt="Meu Kantinho — centro de cultura" className={className} width={500} height={500} decoding="async" />;
}

/** Ícone genérico de câmera (Instagram) desenhado localmente — sem marca registrada. */
export function Instagram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
    </svg>
  );
}
