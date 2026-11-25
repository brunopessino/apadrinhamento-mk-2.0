import { Check, Copy, HandHeart } from 'lucide-react';
import type { PixConfig } from '@/types';
import { PIX_INTRO, pixKeyLine } from '@/config/campaign';
import { useClipboard } from '@/hooks/useClipboard';

/**
 * Bloco Pix OBRIGATÓRIO em todos os cards (disponíveis e apadrinhados).
 * Texto integral, sempre visível, sem depender de interação.
 * Copiar a chave NÃO altera a disponibilidade de ninguém.
 */
export function PixBox({ pix, compact = false }: { pix: PixConfig; compact?: boolean }) {
  const { state, copy } = useClipboard();
  return (
    <div data-testid="pix-box" className={`rounded-2xl border border-gold/45 bg-gradient-to-br from-cream to-[#F6EEDB] ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-start gap-2.5">
        <HandHeart className="mt-0.5 h-5 w-5 shrink-0 text-pine" aria-hidden="true" />
        <div className="min-w-0 text-sm leading-relaxed text-graphite">
          <p data-testid="pix-intro">{PIX_INTRO}</p>
          <p data-testid="pix-key" className="mt-1 break-words font-semibold text-burgundy">{pixKeyLine(pix)}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => copy(pix.key)}
        className="btn btn-sm mt-3 w-full border border-pine/25 bg-paper text-pine hover:bg-pine hover:text-white"
      >
        {state === 'copied' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        {state === 'copied' ? 'Chave copiada!' : 'Copiar chave Pix'}
      </button>
      <p role="status" aria-live="polite" className="sr-only">
        {state === 'copied' ? 'Chave Pix copiada para a área de transferência.' : state === 'error' ? 'Não foi possível copiar automaticamente. Selecione a chave e copie manualmente.' : ''}
      </p>
      {state === 'error' && <p className="mt-2 text-xs text-red">Não foi possível copiar automaticamente. Selecione a chave acima e copie manualmente.</p>}
    </div>
  );
}
