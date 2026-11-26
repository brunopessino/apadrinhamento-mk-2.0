import { memo, useState } from 'react';
import { Gift, Heart, Music2, Ruler, Footprints } from 'lucide-react';
import type { PixConfig, PublicParticipant } from '@/types';
import { PixBox } from './PixBox';
import { INSTITUTION } from '@/config/campaign';
import { Star } from './decor/Decor';

function Photo({ p }: { p: PublicParticipant }) {
  const [failed, setFailed] = useState(false);
  const src = p.photoUrl || p.photoData;
  if (!src || failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-cream-200 to-[#EADFC8] text-gold-ink" role="img" aria-label="Foto não disponível">
        <img src={INSTITUTION.logo} alt="" className="h-20 w-20 rounded-full bg-paper/80 object-contain p-2 opacity-90" loading="lazy" />
        <span className="text-xs font-medium">Foto não disponível</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={`Foto de ${p.displayName}`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover object-[50%_25%] transition-transform duration-500 group-hover:scale-[1.03]"
    />
  );
}

interface Props {
  p: PublicParticipant;
  pix: PixConfig;
  onSponsor: (p: PublicParticipant) => void;
  justSponsored?: boolean;
  /** campanha não aceita novos apadrinhamentos */
  closed?: boolean;
  /** versão discreta (participantes já apadrinhados) */
  compact?: boolean;
}

export const ParticipantCard = memo(function ParticipantCard({ p, pix, onSponsor, justSponsored, closed, compact }: Props) {
  const details = [
    p.group && { icon: Music2, label: 'Turma', value: p.group },
    p.clothingSize && { icon: Ruler, label: 'Roupa', value: p.clothingSize },
    p.shoeSize && { icon: Footprints, label: 'Calçado', value: p.shoeSize },
  ].filter(Boolean) as { icon: typeof Gift; label: string; value: string }[];

  return (
    <article
      data-testid="participant-card"
      data-sponsored={p.sponsored ? 'true' : 'false'}
      aria-labelledby={`pname-${p.id}`}
      className="group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-gold/50 bg-paper shadow-[0_18px_40px_-22px_rgb(0_0_0/.55)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_26px_50px_-20px_rgb(0_0_0/.6),0_0_0_1px_rgb(234_191_53/.6)] motion-reduce:hover:translate-y-0"
    >
      {/* laço de presente no topo do card */}
      <svg aria-hidden="true" viewBox="0 0 120 50" className={`pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 drop-shadow-md ${compact ? 'w-16' : 'w-24'}`}>
        <path d="M60 18 C 44 -4, 18 0, 24 18 C 28 30, 48 28, 60 18Z" fill={p.sponsored ? '#C5A059' : '#B5222D'} />
        <path d="M60 18 C 76 -4, 102 0, 96 18 C 92 30, 72 28, 60 18Z" fill={p.sponsored ? '#A9843E' : '#9C1C26'} />
        <path d="M56 20 L 44 48 L 52 44 L 56 50 L 60 22Z" fill={p.sponsored ? '#A9843E' : '#8E1B24'} />
        <path d="M64 20 L 76 48 L 68 44 L 64 50 L 60 22Z" fill={p.sponsored ? '#C5A059' : '#B5222D'} />
        <ellipse cx="60" cy="18" rx="8" ry="7" fill={p.sponsored ? '#E6C77A' : '#D63B45'} />
      </svg>
      <div className={`relative overflow-hidden bg-cream-200 ${compact ? 'aspect-[4/3] saturate-[.7]' : 'aspect-[4/5]'}`}>
        <Photo p={p} />
        {p.sponsored && (
          <div className={`absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-pine/85 to-transparent pb-3 pt-10 ${justSponsored ? 'seal-in' : ''}`}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/70 bg-pine px-3.5 py-1.5 text-sm font-semibold text-cream shadow-gold">
              <Star className="h-3.5 w-3.5 text-yellow" /> Apadrinhado
            </span>
          </div>
        )}
      </div>
      <div className={`flex flex-1 flex-col ${compact ? 'gap-2 p-3.5' : 'gap-3 p-4 sm:p-5'}`}>
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="chip">{p.category}</span>
            {p.sponsored
              ? <span className="chip border-pine/30 bg-pine/10 text-pine">Apadrinhado</span>
              : <span className="chip border-red/25 bg-red/5 text-red">Disponível para apadrinhamento</span>}
          </div>
          <h3 id={`pname-${p.id}`} className={`font-semibold leading-tight text-burgundy ${compact ? 'text-lg' : 'text-xl'}`}>{p.displayName}</h3>
          {p.age != null && <p className="text-sm text-muted">{p.age} {p.age === 1 ? 'ano' : 'anos'}</p>}
        </div>
        {!compact && details.length > 0 && (
          <dl className="grid grid-cols-1 gap-1.5 text-sm">
            {details.map((d) => (
              <div key={d.label} className="flex items-center gap-2">
                <d.icon className="h-4 w-4 shrink-0 text-gold-ink" aria-hidden="true" />
                <dt className="text-muted">{d.label}:</dt>
                <dd className="min-w-0 truncate font-medium" title={d.value}>{d.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="mt-auto pt-1">
          {p.sponsored ? (
            <button type="button" disabled className="btn w-full border border-pine/25 bg-pine/5 px-5 py-2.5 text-pine" aria-label={`${p.displayName} já foi apadrinhado`}>
              <Heart className="h-4 w-4 fill-current" aria-hidden="true" /> Já apadrinhado
            </button>
          ) : closed ? (
            <button type="button" disabled className="btn w-full border border-line bg-cream-200 px-5 py-2.5 text-muted">Apadrinhamentos encerrados</button>
          ) : (
            <button type="button" onClick={() => onSponsor(p)} className="btn-primary w-full" aria-label={`Quero apadrinhar ${p.displayName}`}>
              <Heart className="h-4 w-4" aria-hidden="true" /> Quero apadrinhar
            </button>
          )}
        </div>
        <PixBox pix={pix} compact />
      </div>
    </article>
  );
});
