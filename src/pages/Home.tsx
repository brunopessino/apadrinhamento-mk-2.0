import { useEffect, useMemo, useRef, useState } from 'react';
import { Gift, HandHeart, Heart, Search, SlidersHorizontal, Sparkles, Users, WifiOff, RefreshCw, XCircle, Globe, Music } from 'lucide-react';
import type { Campaign, PublicParticipant } from '@/types';
import { useData } from '@/hooks/DataContext';
import { CAMPAIGN_TEXTS, DEFAULT_PIX, FALLBACK_CATEGORIES, INSTITUTION, PIX_INTRO, pixKeyLine } from '@/config/campaign';
import { computeStats } from '@/lib/stats';
import { AGE_BANDS, EMPTY_FILTERS, distinct, filterParticipants, hasActiveFilters, type CatalogFilters } from '@/lib/filters';
import { ParticipantCard } from '@/components/ParticipantCard';
import { SponsorDialog } from '@/components/SponsorDialog';
import { PixBox } from '@/components/PixBox';
import { MusicNote, PineBranch, RibbonBow, Sparkle, Star, Logo, Instagram } from '@/components/decor/Decor';
import { Garland, Ornament, Snowfall } from '@/components/decor/Festive';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { WavingSanta } from '@/components/decor/WavingSanta';

function Hero({ campaign }: { campaign: Campaign | null }) {
  const title = campaign?.heroTitle ?? CAMPAIGN_TEXTS.heroTitle;
  // "Apadrinhamento de Natal 2026" -> destaque manuscrito em "de Natal"
  const m = title.match(/^(.*?)\s+(de Natal)\s*(\d{4})?$/i);
  return (
    <section aria-labelledby="hero-title" className="bg-velvet relative overflow-hidden text-cream">
      <Snowfall />
      <RibbonBow className="absolute inset-x-0 top-0 z-[1] h-20 sm:h-24 lg:h-28" />
      <PineBranch className="pointer-events-none absolute -left-10 top-14 z-[1] w-56 opacity-95 sm:w-72 lg:w-96" />
      <PineBranch flip className="pointer-events-none absolute -right-10 top-14 z-[1] w-56 opacity-95 sm:w-72 lg:w-96" />
      <div className="container-mk relative z-[2] grid items-center gap-12 pb-24 pt-36 sm:pt-40 lg:grid-cols-[1.1fr_.9fr] lg:pb-32 lg:pt-44">
        <div className="hero-enter">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-yellow"><Star className="twinkle h-3.5 w-3.5" />{INSTITUTION.name}</p>
          <h1 id="hero-title" className="mt-4 text-balance font-display text-[2.6rem] font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
            {m ? (<>{m[1]} <span className="whitespace-nowrap"><span className="text-script gold-text inline-block pb-1 pr-2 text-[1.45em] leading-[0.95]">{m[2]}</span>{m[3] && <>{' '}<span className="ml-1 text-cream/95 sm:ml-2">{m[3]}</span></>}</span></>) : title}
          </h1>
          <p className="mt-6 max-w-xl font-display text-2xl italic leading-snug text-[#FFE7A3] sm:text-[1.75rem]">
            {campaign?.heroMessage ?? CAMPAIGN_TEXTS.mainMessage}
          </p>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-cream/85 sm:text-lg">
            {campaign?.institutionalMessage ?? CAMPAIGN_TEXTS.institutionalMessage}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href="#catalogo" className="btn bg-gradient-to-b from-[#FFE08A] to-[#EABF35] px-8 py-3.5 text-base text-burgundy-900 shadow-[0_10px_30px_-8px_rgb(234_191_53/.7)] hover:brightness-105 active:translate-y-px">
              <Heart className="h-5 w-5 fill-current" aria-hidden="true" />Quero apadrinhar
            </a>
            <a href="#como-participar" className="btn border border-cream/40 px-6 py-3.5 text-cream hover:bg-cream/10">Como funciona</a>
          </div>
          <p className="mt-5 flex items-center gap-2 text-sm text-cream/70"><MusicNote className="h-4 w-4 text-yellow/80" />{CAMPAIGN_TEXTS.chain}</p>
        </div>
        <HeroArt />
      </div>
      <div className="santa-bob pointer-events-none absolute bottom-10 right-4 z-[2] w-24 sm:right-8 sm:w-32 lg:hidden" aria-hidden="true"><WavingSanta className="h-auto w-full" /></div>
      <Garland className="relative z-[2] -mb-1" />
    </section>
  );
}

function HeroArt() {
  return (
    <div className="relative mx-auto hidden h-[30rem] w-full max-w-md lg:block" aria-hidden="true">
      <Ornament color="gold" string={40} className="left-6 -top-44" delay={0.4} />
      <Ornament color="red" string={96} size={52} className="left-[42%] -top-44" />
      <Ornament color="green" string={58} className="right-8 -top-44" delay={1.1} />
      <div className="absolute inset-x-6 top-16 -bottom-2 rounded-[2.5rem] bg-yellow/25 blur-3xl" />
      <div className="absolute inset-x-4 top-20 rotate-[2deg] rounded-[1.75rem] bg-paper p-8 text-graphite shadow-[0_30px_60px_-20px_rgb(0_0_0/.6)] gold-frame">
        <div className="flex items-center justify-center">
          <div className="grid h-36 w-36 place-items-center rounded-full bg-cream ring-8 ring-cream-200"><Logo className="h-28 w-28 object-contain" /></div>
        </div>
        <p className="text-script mt-5 text-center text-4xl leading-tight text-red">Feliz Natal</p>
        <p className="mt-3 text-center font-display text-xl italic leading-snug text-burgundy">“O que vale é o cuidado, o afeto e o acolhimento.”</p>
        <div className="mt-5 flex items-center justify-center gap-4 text-gold">
          <MusicNote className="h-5 w-5 text-burgundy/70" /><Star className="h-4 w-4" /><Sparkle className="h-3.5 w-3.5 text-yellow" /><Star className="h-4 w-4" /><MusicNote className="h-5 w-5 text-pine/70" />
        </div>
      </div>
      <div className="absolute -left-6 bottom-6 -rotate-6 rounded-xl bg-pine px-4 py-2.5 text-cream shadow-lift">
        <p className="flex items-center gap-2 text-sm font-semibold"><Gift className="h-4 w-4 text-yellow" />Presenteie com o que puder</p>
      </div>
      <div className="santa-bob absolute -bottom-20 -right-6 z-[3] w-40"><WavingSanta className="h-auto w-full" /></div>
      <Sparkle className="twinkle absolute right-2 top-28 h-6 w-6 text-yellow" />
      <Sparkle className="twinkle absolute -left-2 top-48 h-4 w-4 text-cream" style={{ animationDelay: '1.2s' }} />
    </div>
  );
}

function Stats({ participants }: { participants: PublicParticipant[] | null }) {
  const s = useMemo(() => computeStats(participants ?? []), [participants]);
  const loading = participants === null;
  const tiles = [
    { label: 'Participantes', value: s.total, icon: Users },
    { label: 'Disponíveis', value: s.available, icon: Heart },
    { label: 'Apadrinhados', value: s.sponsored, icon: Gift },
    { label: 'da meta', value: `${s.percent}%`, icon: Sparkles },
  ];
  return (
    <div className="container-mk relative z-[3] -mt-10 pb-4">
      <div className="relative rounded-[1.5rem] border border-gold/50 bg-paper p-5 shadow-[0_24px_50px_-24px_rgb(62_20_24/.55)] sm:p-7" aria-labelledby="stats-title" role="region" aria-busy={loading}>
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-red px-4 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cream shadow-soft">Ao vivo</span>
        <h2 id="stats-title" className="sr-only">Indicadores da campanha em tempo real</h2>
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4 md:divide-x md:divide-line">
          {tiles.map((t) => (
            <div key={t.label} className="flex items-center gap-3 md:justify-center md:px-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-b from-red to-burgundy text-cream shadow-soft"><t.icon className="h-5 w-5" aria-hidden="true" /></span>
              <div>
                <p className="font-display text-3xl font-semibold leading-none text-burgundy sm:text-4xl" data-testid={`stat-${t.label}`}>{loading ? '—' : t.value}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted">{t.label}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-cream-200" role="progressbar" aria-label="Progresso da campanha" aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.percent}>
            <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${s.percent}%`, background: 'repeating-linear-gradient(135deg, #B5222D 0 10px, #D63B45 10px 20px)' }} />
          </div>
          <p className="mt-2 text-sm text-muted" aria-live="polite">{loading ? 'Carregando indicadores…' : `${s.sponsored} de ${s.total} participantes já foram apadrinhados.`}</p>
        </div>
      </div>
    </div>
  );
}

function GoalReached({ total }: { total: number }) {
  const reduced = useReducedMotion();
  const [animate] = useState(() => {
    if (reduced) return false;
    try { if (sessionStorage.getItem('mk-goal-celebrated')) return false; sessionStorage.setItem('mk-goal-celebrated', '1'); } catch { /* */ }
    return true;
  });
  return (
    <div className="container-mk pb-4">
      <div role="status" className="relative overflow-hidden rounded-[var(--radius-card)] border border-gold/60 bg-gradient-to-r from-pine to-pine-700 px-6 py-6 text-cream shadow-gold">
        <div className="flex items-center gap-4">
          <Star className={`h-10 w-10 shrink-0 text-yellow ${animate ? 'seal-in' : ''}`} />
          <div>
            <p className="font-display text-2xl font-semibold">{CAMPAIGN_TEXTS.goalReached}</p>
            <p className="text-sm text-cream/80">{total} participantes apadrinhados com carinho.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HowTo({ campaign }: { campaign: Campaign | null }) {
  const pix = campaign?.pix ?? DEFAULT_PIX;
  return (
    <section id="como-participar" aria-labelledby="how-title" className="container-mk scroll-mt-20 py-20">
      <div className="text-center">
        <p className="eyebrow">Como participar</p>
        <h2 id="how-title" className="mt-2 text-balance text-3xl font-semibold text-burgundy sm:text-5xl">Três passos para <span className="text-script text-[1.3em] text-red">espalhar sorrisos</span></h2>
      </div>
      <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
        {CAMPAIGN_TEXTS.steps.map((s, i) => (
          <li key={s.title} className="relative rounded-[1.25rem] bg-paper p-7 pt-10 text-center shadow-soft gold-frame">
            {/* etiqueta de presente: furo e cordão */}
            <span aria-hidden="true" className="absolute left-1/2 top-3 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-gold bg-cream" />
            <span aria-hidden="true" className="absolute -top-6 left-1/2 h-9 w-px -translate-x-1/2 bg-gold" />
            <span className="text-script block text-6xl leading-none text-red" aria-hidden="true">{i + 1}</span>
            <h3 className="mt-3 text-xl font-semibold text-burgundy">{s.title}</h3>
            <p className="mt-2 text-muted">{s.text}</p>
          </li>
        ))}
      </ol>
      <div className="bg-pine-night relative mt-12 grid items-center gap-6 overflow-hidden rounded-[1.75rem] p-7 text-cream shadow-lift sm:p-10 md:grid-cols-[1fr_minmax(0,24rem)]">
        <Sparkle aria-hidden="true" className="twinkle absolute right-6 top-5 h-5 w-5 text-yellow" />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow">Outra forma de ajudar</p>
          <h3 className="mt-2 flex items-center gap-2 text-2xl font-semibold sm:text-3xl"><HandHeart className="h-6 w-6 text-yellow" aria-hidden="true" />Prefere contribuir via Pix?</h3>
          <p className="mt-3 max-w-lg text-cream/85">{PIX_INTRO} A contribuição via Pix é independente do apadrinhamento e não reserva nenhum participante.</p>
          <p className="sr-only">{pixKeyLine(pix)}</p>
        </div>
        <PixBox pix={pix} />
      </div>
    </section>
  );
}

function FilterBar({ f, setF, categories, groups, count, total }: { f: CatalogFilters; setF: (f: CatalogFilters) => void; categories: string[]; groups: string[]; count: number; total: number }) {
  const [showMore, setShowMore] = useState(false);
  const upd = (patch: Partial<CatalogFilters>) => setF({ ...f, ...patch });
  return (
    <div className="card-surface p-4 sm:p-5" role="search" aria-label="Buscar e filtrar participantes">
      <div className="flex flex-col gap-3 md:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Buscar por nome</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input type="search" className="field pl-11" placeholder="Buscar por nome" value={f.search} onChange={(e) => upd({ search: e.target.value })} />
        </label>
        <div className="grid grid-cols-2 gap-3 md:flex">
          <label className="md:w-52"><span className="sr-only">Disponibilidade</span>
            <select className="field" value={f.availability} onChange={(e) => upd({ availability: e.target.value as CatalogFilters['availability'] })}>
              <option value="">Todos</option><option value="available">Disponíveis</option><option value="sponsored">Apadrinhados</option>
            </select>
          </label>
          <button type="button" className="btn-ghost md:hidden" aria-expanded={showMore} aria-controls="more-filters" onClick={() => setShowMore((v) => !v)}>
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />Filtros
          </button>
        </div>
      </div>
      <div id="more-filters" className={`${showMore ? 'grid' : 'hidden'} mt-3 grid-cols-1 gap-3 sm:grid-cols-2 md:grid md:grid-cols-4`}>
        <label><span className="label">Categoria</span>
          <select className="field" value={f.category} onChange={(e) => upd({ category: e.target.value })}>
            <option value="">Todas</option>{categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label><span className="label">Turma</span>
          <select className="field" value={f.group} onChange={(e) => upd({ group: e.target.value })}>
            <option value="">Todas</option>{groups.map((g) => <option key={g}>{g}</option>)}
          </select>
        </label>
        <label><span className="label">Faixa etária</span>
          <select className="field" value={f.ageBand} onChange={(e) => upd({ ageBand: e.target.value as CatalogFilters['ageBand'] })}>
            <option value="">Todas</option>{AGE_BANDS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </label>
        <label><span className="label">Ordenar por</span>
          <select className="field" value={f.sort} onChange={(e) => upd({ sort: e.target.value as CatalogFilters['sort'] })}>
            <option value="name">Nome (A–Z)</option><option value="ageAsc">Idade (menor primeiro)</option><option value="ageDesc">Idade (maior primeiro)</option>
          </select>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted" aria-live="polite" data-testid="result-count"><strong className="text-graphite">{count}</strong> de {total} participantes</p>
        {hasActiveFilters(f) && <button type="button" className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-red hover:bg-red/5" onClick={() => setF({ ...EMPTY_FILTERS, sort: f.sort })}><XCircle className="h-4 w-4" aria-hidden="true" />Limpar filtros</button>}
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="card-surface overflow-hidden">
          <div className="aspect-[4/5] animate-pulse bg-cream-200" />
          <div className="space-y-3 p-5"><div className="h-5 w-2/3 animate-pulse rounded bg-cream-200" /><div className="h-4 w-1/2 animate-pulse rounded bg-cream-200" /><div className="h-24 animate-pulse rounded-xl bg-cream-200" /></div>
        </div>
      ))}
    </div>
  );
}

function Catalog({ campaign }: { campaign: Campaign }) {
  const { participants, online } = useData();
  const [f, setF] = useState<CatalogFilters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<PublicParticipant | null>(null);
  const [recent, setRecent] = useState<Set<string>>(new Set());
  const prev = useRef<Map<string, boolean>>(new Map());
  const list = participants.status === 'ready' ? participants.data : [];

  // detecta transições disponível -> apadrinhado em tempo real (selo animado)
  useEffect(() => {
    if (participants.status !== 'ready') return;
    const changed: string[] = [];
    for (const p of list) { if (prev.current.get(p.id) === false && p.sponsored) changed.push(p.id); }
    prev.current = new Map(list.map((p) => [p.id, p.sponsored]));
    if (changed.length) setRecent((r) => new Set([...r, ...changed]));
  }, [list, participants.status]);

  const categories = useMemo(() => { const c = distinct(list.map((p) => p.category)); return c.length ? c : FALLBACK_CATEGORIES; }, [list]);
  const groups = useMemo(() => distinct(list.map((p) => p.group)), [list]);
  const shown = useMemo(() => filterParticipants(list, f), [list, f]);
  // Quem ainda espera um padrinho fica em evidência; os já apadrinhados vão para o fim, em versão discreta.
  const available = useMemo(() => shown.filter((p) => !p.sponsored), [shown]);
  const sponsoredList = useMemo(() => shown.filter((p) => p.sponsored), [shown]);
  const pix = campaign.pix ?? DEFAULT_PIX;
  const live = selected ? list.find((p) => p.id === selected.id) : undefined;
  const accepting = campaign.status === 'active';

  return (
    <section id="catalogo" aria-labelledby="catalog-title" className="bg-pine-night relative scroll-mt-20 pb-20">
      <Garland className="-mt-px rotate-180" withLights={false} />
      <Snowfall density={0.45} />
      <div className="relative mx-auto w-full max-w-[1440px] px-4 pt-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow">Catálogo de participantes</p>
            <h2 id="catalog-title" className="mt-2 text-balance text-3xl font-semibold text-cream sm:text-5xl">Escolha quem você vai <span className="text-script gold-text text-[1.3em]">presentear</span></h2>
            <p className="mt-3 max-w-2xl text-cream/80">{CAMPAIGN_TEXTS.giftNote} Presenteie com o que puder.</p>
          </div>
        </div>
        {!accepting && <p role="status" className="mb-4 rounded-2xl bg-yellow px-4 py-3 text-sm font-semibold text-graphite">A campanha não está recebendo novos apadrinhamentos no momento. Obrigado a todos que participaram!</p>}
        {!online && <p role="status" className="mb-4 flex items-center gap-2 rounded-2xl bg-yellow px-4 py-3 text-sm font-semibold text-graphite"><WifiOff className="h-4 w-4" aria-hidden="true" />Você está sem internet. Os dados serão atualizados quando a conexão voltar.</p>}
        <FilterBar f={f} setF={setF} categories={categories} groups={groups} count={shown.length} total={list.length} />
        <div className="mt-6">
          {participants.status === 'loading' && <><p className="sr-only" role="status">Carregando participantes…</p><SkeletonGrid /></>}
          {participants.status === 'error' && (
            <div role="alert" className="card-surface flex flex-col items-center gap-3 p-10 text-center">
              <WifiOff className="h-10 w-10 text-red" aria-hidden="true" />
              <p className="text-lg font-semibold">{participants.error}</p>
              <button type="button" className="btn-ghost" onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4" aria-hidden="true" />Tentar novamente</button>
            </div>
          )}
          {participants.status === 'ready' && list.length === 0 && (
            <div className="card-surface p-10 text-center"><p className="text-lg font-semibold text-burgundy">Os participantes ainda estão sendo preparados com carinho.</p><p className="mt-1 text-muted">Volte em breve!</p></div>
          )}
          {participants.status === 'ready' && list.length > 0 && shown.length === 0 && (
            <div className="card-surface p-10 text-center">
              <p className="text-lg font-semibold">Nenhum participante encontrado com esses filtros.</p>
              <button type="button" className="btn-ghost mt-4" onClick={() => setF(EMPTY_FILTERS)}>Limpar filtros</button>
            </div>
          )}
          {available.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="catalog-grid">
              {available.map((p) => (
                <ParticipantCard key={p.id} p={p} pix={pix} closed={!accepting} onSponsor={setSelected} />
              ))}
            </div>
          )}
          {shown.length > 0 && available.length === 0 && f.availability !== 'sponsored' && (
            <div className="rounded-[var(--radius-card)] border border-gold/40 bg-paper/95 p-8 text-center">
              <p className="font-display text-2xl font-semibold text-burgundy">Todos os participantes deste filtro já foram apadrinhados.</p>
              <p className="mt-1 text-muted">Que tal ajustar os filtros ou contribuir via Pix?</p>
            </div>
          )}
          {sponsoredList.length > 0 && (
            <section aria-labelledby="sponsored-title" className="mt-14" data-testid="sponsored-section">
              <div className="mb-5 flex items-center gap-4">
                <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/60" />
                <h3 id="sponsored-title" className="text-center font-display text-xl font-semibold text-cream sm:text-2xl">
                  <span className="text-script gold-text mr-2 text-[1.4em]">Já apadrinhados</span>
                  <span className="text-cream/75">({sponsoredList.length}) · obrigado!</span>
                </h3>
                <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/60" />
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {sponsoredList.map((p) => (
                  <div key={p.id} className={recent.has(p.id) ? 'rise-in' : ''}>
                    <ParticipantCard p={p} pix={pix} compact justSponsored={recent.has(p.id)} onSponsor={setSelected} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
      <SponsorDialog participant={selected} live={live} campaign={campaign} onClose={() => setSelected(null)} onConfirmed={(id) => setRecent((r) => new Set([...r, id]))} />
    </section>
  );
}

function Institution() {
  return (
    <section id="meu-kantinho" aria-labelledby="inst-title" className="container-mk scroll-mt-20 py-16">
      <div className="bg-velvet relative grid items-center gap-8 overflow-hidden rounded-[2rem] px-6 py-10 text-cream shadow-lift sm:px-10 md:grid-cols-[auto_1fr]">
        <Ornament color="gold" string={30} className="right-[12%] hidden lg:block" delay={0.3} />
        <Ornament color="green" string={70} size={50} className="right-[5%] hidden lg:block" delay={1} />
        <Ornament color="red" string={14} size={38} className="right-[20%] hidden xl:block" delay={1.7} />
        <div className="mx-auto grid h-36 w-36 place-items-center rounded-full bg-paper p-3 ring-4 ring-gold/50"><Logo className="h-full w-full object-contain" /></div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow">Desde {INSTITUTION.founded}</p>
          <h2 id="inst-title" className="mt-2 text-3xl font-semibold">Conheça o Meu Kantinho</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-cream/85 lg:max-w-[34rem] xl:max-w-2xl">{INSTITUTION.about} Uma instituição de atuação social, cultural, musical e socioambiental, onde cada nota é também um gesto de cuidado.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href={INSTITUTION.site} target="_blank" rel="noopener noreferrer" className="btn bg-cream px-5 py-2.5 text-burgundy hover:bg-white"><Globe className="h-4 w-4" aria-hidden="true" />Conheça nossa história</a>
            <a href={INSTITUTION.instagram} target="_blank" rel="noopener noreferrer" className="btn border border-cream/40 px-5 py-2.5 text-cream hover:bg-cream/10"><Instagram className="h-4 w-4" aria-hidden="true" />Acompanhe as atividades</a>
          </div>
        </div>
      </div>
      <p className="mt-6 flex items-center justify-center gap-2 text-center text-sm text-muted"><Music className="h-4 w-4" aria-hidden="true" />{CAMPAIGN_TEXTS.chain}</p>
    </section>
  );
}

export default function Home() {
  const { campaign, participants } = useData();
  const c = campaign.status === 'ready' ? campaign.data : null;
  const list = participants.status === 'ready' ? participants.data : null;
  const stats = computeStats(list ?? []);
  return (
    <>
      <Hero campaign={c} />
      {c && <Stats participants={list} />}
      {c && stats.total > 0 && stats.available === 0 && <GoalReached total={stats.total} />}
      <HowTo campaign={c} />
      {campaign.status === 'loading' && <div className="container-mk"><SkeletonGrid /></div>}
      {campaign.status === 'error' && <div className="container-mk"><p role="alert" className="card-surface p-8 text-center font-semibold">{campaign.error}</p></div>}
      {campaign.status === 'ready' && !c && (
        <div className="container-mk"><div className="card-surface p-10 text-center"><p className="text-xl font-semibold text-burgundy">A campanha de Natal 2026 será aberta em breve.</p><p className="mt-2 text-muted">Acompanhe o Instagram do Meu Kantinho para novidades.</p></div></div>
      )}
      {c && <Catalog campaign={c} />}
      <Institution />
    </>
  );
}
