import { useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Globe, Menu, X, Lock, Mail, Phone } from 'lucide-react';
import { CREDITS, INSTITUTION, DATA_MODE } from '@/config/campaign';
import { Logo, Instagram } from './decor/Decor';
import { Garland } from './decor/Festive';
import { useData } from '@/hooks/DataContext';

export function DemoBanner() {
  if (DATA_MODE !== 'demo') return null;
  return (
    <div className="bg-graphite px-4 py-1.5 text-center text-xs font-medium text-cream" role="note">
      Ambiente de demonstração — todos os nomes e imagens são fictícios. Nenhum dado real é exibido ou gravado.
    </div>
  );
}

/** Link para uma seção da página inicial; funciona a partir de qualquer rota e em qualquer roteador. */
function SectionLink({ id, className, children, onNavigate }: { id: string; className?: string; children: ReactNode; onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <a href={`#${id}`} className={className} onClick={(e) => {
      e.preventDefault();
      onNavigate?.();
      const go = () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      if (pathname !== '/') { navigate('/'); setTimeout(go, 120); } else go();
    }}>{children}</a>
  );
}

const nav = [
  { href: 'catalogo', label: 'Participantes' },
  { href: 'como-participar', label: 'Como participar' },
  { href: 'meu-kantinho', label: 'O Meu Kantinho' },
];

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-gold/25 bg-burgundy-900/95 text-cream backdrop-blur supports-[backdrop-filter]:bg-burgundy-900/85" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="container-mk flex h-16 items-center justify-between gap-3">
        <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="Página inicial — Apadrinhamento de Natal Meu Kantinho">
          <Logo className="h-11 w-11 shrink-0 rounded-full bg-paper object-contain ring-1 ring-line" />
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-display text-base font-semibold text-cream sm:text-lg">Meu Kantinho</span>
            <span className="block truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-yellow">Natal 2026</span>
          </span>
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          {nav.map((n) => <SectionLink key={n.href} id={n.href} className="rounded-full px-3 py-2 text-sm font-medium text-cream/90 hover:bg-cream/10 hover:text-cream">{n.label}</SectionLink>)}
          <a href={INSTITUTION.site} target="_blank" rel="noopener noreferrer" className="rounded-full p-2.5 text-cream/75 hover:bg-cream/10 hover:text-cream" aria-label="Site institucional (abre em nova aba)"><Globe className="h-5 w-5" /></a>
          <a href={INSTITUTION.instagram} target="_blank" rel="noopener noreferrer" className="rounded-full p-2.5 text-cream/75 hover:bg-cream/10 hover:text-cream" aria-label="Instagram do Meu Kantinho (abre em nova aba)"><Instagram className="h-5 w-5" /></a>
          <SectionLink id="catalogo" className="btn ml-2 bg-gradient-to-b from-[#FFE08A] to-[#EABF35] px-5 py-2 text-sm text-burgundy-900 hover:brightness-105">Quero apadrinhar</SectionLink>
        </nav>
        <button type="button" className="grid h-11 w-11 place-items-center rounded-full hover:bg-cream/10 lg:hidden" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Fechar menu' : 'Abrir menu'} onClick={() => setOpen((v) => !v)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Principal (celular)" className="border-t border-cream/15 bg-burgundy-900 lg:hidden">
          <div className="container-mk flex flex-col py-2">
            {nav.map((n) => <SectionLink key={n.href} id={n.href} onNavigate={() => setOpen(false)} className="rounded-xl px-3 py-3 font-medium hover:bg-cream/10">{n.label}</SectionLink>)}
            <a href={INSTITUTION.site} target="_blank" rel="noopener noreferrer" className="rounded-xl px-3 py-3 font-medium hover:bg-cream/10">Site institucional</a>
            <a href={INSTITUTION.instagram} target="_blank" rel="noopener noreferrer" className="rounded-xl px-3 py-3 font-medium hover:bg-cream/10">Instagram</a>
          </div>
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  const { campaign } = useData();
  const c = campaign.status === 'ready' ? campaign.data : null;
  const email = c?.contactEmail || INSTITUTION.contactEmail;
  const phone = c?.contactPhone || INSTITUTION.contactPhone;
  return (
    <footer className="bg-burgundy-900 text-cream" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <Garland className="-mt-8" />
      <div className="container-mk grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <Logo className="h-14 w-14 rounded-full bg-paper object-contain p-1" />
            <div>
              <p className="font-display text-xl font-semibold">{INSTITUTION.name}</p>
              <p className="text-sm text-cream/75">Desde {INSTITUTION.founded} · música, cultura e acolhimento</p>
            </div>
          </div>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-cream/80">{INSTITUTION.about}</p>
        </div>
        <div>
          <h2 className="font-sans text-sm font-bold uppercase tracking-[0.16em] text-yellow">Campanha</h2>
          <ul className="mt-3 space-y-2 text-sm text-cream/85">
            <li>{c?.name ?? 'Apadrinhamento de Natal'}</li>
            <li><SectionLink id="catalogo" className="hover:underline">Participantes</SectionLink></li>
            <li><Link to="/privacidade" className="hover:underline">Política de privacidade</Link></li>
            <li><Link to="/admin" className="inline-flex items-center gap-1.5 text-cream/60 hover:text-cream hover:underline" rel="nofollow"><Lock className="h-3.5 w-3.5" aria-hidden="true" />Área da equipe</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="font-sans text-sm font-bold uppercase tracking-[0.16em] text-yellow">Contato</h2>
          <ul className="mt-3 space-y-2 text-sm text-cream/85">
            <li><a href={INSTITUTION.site} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:underline"><Globe className="h-4 w-4" aria-hidden="true" />meukantinho.com.br</a></li>
            <li><a href={INSTITUTION.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:underline"><Instagram className="h-4 w-4" aria-hidden="true" />@meukantinho_oficial</a></li>
            {email && <li><a href={`mailto:${email}`} className="inline-flex items-center gap-2 hover:underline"><Mail className="h-4 w-4" aria-hidden="true" />{email}</a></li>}
            {phone && <li className="inline-flex items-center gap-2"><Phone className="h-4 w-4" aria-hidden="true" />{phone}</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-cream/15">
        <div className="container-mk flex flex-col gap-1 py-5 text-xs text-cream/65 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {INSTITUTION.name}. Campanha solidária, sem fins comerciais.</p>
          <p>{CREDITS.current} · {CREDITS.previous}</p>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-pine focus:px-4 focus:py-2 focus:text-white">Pular para o conteúdo</a>
      <DemoBanner />
      <Header />
      <main id="conteudo">{children}</main>
      <Footer />
    </>
  );
}

export { NavLink };
