import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Heart, Loader2, Share2, Copy, Check } from 'lucide-react';
import type { Campaign, PublicParticipant, SponsorResult } from '@/types';
import { Dialog } from './ui/Dialog';
import { ChristmasCelebration, CelebrationBoundary } from './ChristmasCelebration';
import { GiftBoxArt } from './decor/Decor';
import { CAMPAIGN_TEXTS, IS_EMBED, SITE_URL, campaignGuidelines } from '@/config/campaign';
import { isValidBrPhone, maskPhone } from '@/lib/phone';
import { useData } from '@/hooks/DataContext';
import { useClipboard } from '@/hooks/useClipboard';

type Phase =
  | { kind: 'form' }
  | { kind: 'submitting' }
  | { kind: 'success'; protocol: string; name: string }
  | { kind: 'conflict'; message: string }
  | { kind: 'error'; message: string };

interface Props {
  participant: PublicParticipant | null;
  /** versão em tempo real do mesmo participante (para detectar conflito antes do envio) */
  live?: PublicParticipant;
  campaign: Campaign;
  onClose: () => void;
  onConfirmed?: (participantId: string) => void;
}

const shareText = (c: Campaign) => `${c.heroTitle} — Meu Kantinho. ${CAMPAIGN_TEXTS.mainMessage}`;
const shareUrl = () => SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');

export function SponsorDialog({ participant, live, campaign, onClose, onConfirmed }: Props) {
  const { service, online } = useData();
  const [phase, setPhase] = useState<Phase>({ kind: 'form' });
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState(false);
  const inFlight = useRef(false);
  const ids = { name: useId(), phone: useId(), consent: useId(), err: useId() };
  const { state: copyState, copy } = useClipboard();

  useEffect(() => {
    if (participant) { setPhase({ kind: 'form' }); setTouched(false); inFlight.current = false; }
  }, [participant?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Outro padrinho confirmou enquanto o formulário estava aberto.
  useEffect(() => {
    if (live?.sponsored && (phase.kind === 'form')) setPhase({ kind: 'conflict', message: CAMPAIGN_TEXTS.conflict });
  }, [live?.sponsored, phase.kind]);

  if (!participant) return null;

  const nameError = name.trim().length < 2 ? 'Informe seu nome.' : null;
  const phoneError = !isValidBrPhone(phone) ? 'Informe um WhatsApp válido com DDD, por exemplo (21) 99999-9999.' : null;
  const consentError = !consent ? 'Confirme a ciência sobre o tratamento dos dados.' : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (nameError || phoneError || consentError || !service || inFlight.current || !participant) return;
    inFlight.current = true; // bloqueia cliques repetidos
    setPhase({ kind: 'submitting' });
    let r: SponsorResult;
    try {
      r = await service.sponsor({ campaignId: campaign.id, participantId: participant.id, sponsorName: name, sponsorPhone: phone, consent });
    } catch {
      r = { ok: false, code: 'unknown', message: 'Não foi possível confirmar agora. Tente novamente.' };
    }
    if (r.ok) {
      setPhase({ kind: 'success', protocol: r.protocol, name: r.participantDisplayName });
      onConfirmed?.(r.participantId);
    } else {
      inFlight.current = false;
      setPhase(r.code === 'already' ? { kind: 'conflict', message: r.message } : { kind: 'error', message: r.message });
    }
  }

  const locked = phase.kind === 'submitting';
  const title = phase.kind === 'success' ? CAMPAIGN_TEXTS.confirmedTitle : `Apadrinhar ${participant.displayName}`;

  return (
    <Dialog open={!!participant} onClose={onClose} title={title} hideTitle={phase.kind === 'success'} locked={locked}>
      {phase.kind === 'success' ? (
        <div data-testid="sponsor-success" className="text-center">
          <CelebrationBoundary fallback={<div className="cc-root" data-testid="celebration" data-mode="fallback" aria-hidden="true"><GiftBoxArt open /></div>}>
            <ChristmasCelebration playKey={phase.protocol} name={phase.name} />
          </CelebrationBoundary>
          <div role="status" aria-live="assertive">
            <h2 className="mt-1 text-3xl font-semibold text-burgundy">{CAMPAIGN_TEXTS.confirmedTitle}</h2>
            <p className="mt-2 text-lg font-medium text-pine">{CAMPAIGN_TEXTS.confirmedMessage}</p>
          </div>
          <p className="mx-auto mt-2 max-w-md text-muted">{CAMPAIGN_TEXTS.confirmedComplement}</p>
          <dl className="mx-auto mt-5 grid max-w-sm grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 rounded-2xl border border-line bg-cream px-4 py-3 text-left text-sm">
            <dt className="text-muted">Participante</dt><dd className="font-semibold">{phase.name}</dd>
            <dt className="text-muted">Protocolo</dt><dd className="font-mono font-semibold tracking-wide text-burgundy" data-testid="protocol">{phase.protocol}</dd>
            <dt className="text-muted">Situação</dt><dd className="font-semibold text-pine">Confirmado</dd>
          </dl>
          <div className="mx-auto mt-4 max-w-md text-left text-sm">
            <p className="font-semibold text-burgundy">Orientações</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-graphite">
              {campaignGuidelines(campaign.guidelines).map((g) => <li key={g}>{g}</li>)}
              <li>{campaign.deliveryInfo?.trim() || CAMPAIGN_TEXTS.deliveryFallback}</li>
            </ul>
            <p className="mt-2 text-xs text-muted">Guarde o número do protocolo. Ele identifica o seu apadrinhamento junto à organização.</p>
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button type="button" className="btn-primary" onClick={onClose}><Heart className="h-4 w-4" aria-hidden="true" />Apadrinhar outra pessoa</button>
            <button type="button" className="btn-ghost" onClick={onClose}><ArrowLeft className="h-4 w-4" aria-hidden="true" />Voltar ao catálogo</button>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="text-muted">Compartilhe a campanha:</span>
            <a className="btn-ghost btn-sm" href={`https://wa.me/?text=${encodeURIComponent(`${shareText(campaign)} ${shareUrl()}`)}`} target="_blank" rel="noopener noreferrer">
              <Share2 className="h-4 w-4" aria-hidden="true" />WhatsApp
            </a>
            <a className="btn-ghost btn-sm" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl())}`} target="_blank" rel="noopener noreferrer">Facebook</a>
            <button type="button" className="btn-ghost btn-sm" onClick={() => copy(shareUrl())}>
              {copyState === 'copied' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copyState === 'copied' ? 'Link copiado' : 'Copiar link'}
            </button>
          </div>
        </div>
      ) : phase.kind === 'conflict' ? (
        <div data-testid="sponsor-conflict" className="text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-gold-ink" aria-hidden="true" />
          <p role="alert" className="mt-3 text-lg font-medium text-burgundy">{phase.message}</p>
          <button type="button" className="btn-primary mt-5" onClick={onClose}>Escolher outra pessoa</button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate aria-describedby={phase.kind === 'error' ? ids.err : undefined}>
          <p className="text-sm text-muted">Confirme seus dados para apadrinhar <strong className="text-graphite">{participant.displayName}</strong>. Não é preciso criar conta.</p>
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor={ids.name} className="label">Seu nome</label>
              <input id={ids.name} className="field" autoComplete="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)}
                aria-invalid={touched && !!nameError} aria-describedby={touched && nameError ? `${ids.name}-e` : undefined} disabled={locked} />
              {touched && nameError && <p id={`${ids.name}-e`} className="mt-1 text-sm text-red">{nameError}</p>}
            </div>
            <div>
              <label htmlFor={ids.phone} className="label">WhatsApp</label>
              <input id={ids.phone} className="field" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(21) 99999-9999" value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))} aria-invalid={touched && !!phoneError}
                aria-describedby={`${ids.phone}-h${touched && phoneError ? ` ${ids.phone}-e` : ''}`} disabled={locked} />
              <p id={`${ids.phone}-h`} className="mt-1 text-xs text-muted">Usado apenas pela organização para combinar a entrega. Nunca é exibido publicamente.</p>
              {touched && phoneError && <p id={`${ids.phone}-e`} className="mt-1 text-sm text-red">{phoneError}</p>}
            </div>
            <div className="rounded-2xl border border-gold/40 bg-cream px-4 py-3 text-sm">
              <p className="font-semibold text-burgundy">Orientações da campanha</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {campaignGuidelines(campaign.guidelines).map((g) => <li key={g}>{g}</li>)}
              </ul>
            </div>
            <div className="flex items-start gap-3">
              <input id={ids.consent} type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} disabled={locked}
                className="mt-1 h-5 w-5 shrink-0 accent-pine" aria-invalid={touched && !!consentError} />
              <label htmlFor={ids.consent} className="text-sm leading-relaxed">
                Estou ciente de que meu nome e WhatsApp serão usados somente pela organização do Meu Kantinho para esta campanha, conforme a{' '}
                <Link to="/privacidade" target={IS_EMBED ? undefined : '_blank'} className="font-semibold text-pine underline underline-offset-2">política de privacidade</Link>.
              </label>
            </div>
            {touched && consentError && <p className="-mt-2 text-sm text-red">{consentError}</p>}
            {phase.kind === 'error' && <p id={ids.err} role="alert" className="rounded-xl bg-red/5 px-3 py-2 text-sm font-medium text-red">{phase.message}</p>}
            {!online && <p role="status" className="rounded-xl bg-yellow/20 px-3 py-2 text-sm">Você parece estar sem internet. A confirmação só acontece com conexão.</p>}
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={locked}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={locked} data-testid="confirm-sponsor">
              {locked ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Confirmando…</> : <><Heart className="h-4 w-4" aria-hidden="true" />Confirmar apadrinhamento</>}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
