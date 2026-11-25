import { lazy, Suspense, useState, type FormEvent } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { BarChart3, ClipboardList, FileDown, FileUp, Gift, HandCoins, History, LayoutDashboard, Loader2, LogOut, Megaphone, ShieldAlert, Users } from 'lucide-react';
import { useAuthState, useData } from '@/hooks/DataContext';
import { DATA_MODE } from '@/config/campaign';
import { Logo } from '@/components/decor/Decor';
import { DemoBanner } from '@/components/Layout';
import { AdminProvider, useAdmin } from './AdminContext';
import { can } from '@/lib/permissions';

const Dashboard = lazy(() => import('./Dashboard'));
const Participants = lazy(() => import('./Participants'));
const Sponsorships = lazy(() => import('./Sponsorships'));
const Sponsors = lazy(() => import('./Sponsors'));
const Contributions = lazy(() => import('./Contributions'));
const Campaigns = lazy(() => import('./Campaigns'));
const ImportPage = lazy(() => import('./ImportPage'));
const Reports = lazy(() => import('./Reports'));
const Audit = lazy(() => import('./Audit'));

function Login() {
  const { service } = useData();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!service) return;
    setBusy(true); setErr(null);
    try { await service.auth.signIn(email, password); } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="grid min-h-[100dvh] place-items-center px-4 py-10">
      <form onSubmit={submit} className="card-surface w-full max-w-sm p-7" aria-labelledby="login-title">
        <div className="flex items-center gap-3"><Logo className="h-12 w-12 rounded-full bg-paper object-contain ring-1 ring-line" /><div><h1 id="login-title" className="text-2xl font-semibold text-burgundy">Área da equipe</h1><p className="text-sm text-muted">Apadrinhamento MK</p></div></div>
        <label className="label mt-6" htmlFor="adm-email">E-mail</label>
        <input id="adm-email" type="email" autoComplete="username" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="label mt-4" htmlFor="adm-pass">Senha</label>
        <input id="adm-pass" type="password" autoComplete="current-password" required className="field" value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <p role="alert" className="mt-3 text-sm font-medium text-red">{err}</p>}
        <button className="btn-primary mt-6 w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Entrar</button>
        {DATA_MODE === 'demo' && (
          <p className="mt-4 rounded-xl bg-cream-200 p-3 text-xs text-muted">Demonstração: <code>admin@demo.mk</code> / <code>demo-admin</code> · <code>operador@demo.mk</code> / <code>demo-operador</code></p>
        )}
        <Link to="/" className="mt-5 block text-center text-sm text-muted underline">Voltar ao site</Link>
      </form>
    </div>
  );
}

function Denied({ email }: { email: string }) {
  const { service } = useData();
  return (
    <div className="grid min-h-[100dvh] place-items-center px-4">
      <div className="card-surface max-w-md p-8 text-center" role="alert">
        <ShieldAlert className="mx-auto h-10 w-10 text-red" aria-hidden="true" />
        <h1 className="mt-3 text-2xl font-semibold text-burgundy">Acesso não autorizado</h1>
        <p className="mt-2 text-muted">A conta <strong>{email}</strong> não possui permissão administrativa ativa. Solicite acesso à administração da campanha.</p>
        <button className="btn-ghost mt-6" onClick={() => service?.auth.signOut()}>Sair</button>
      </div>
    </div>
  );
}

function Forbidden() {
  return <p role="alert" className="card-surface p-6 font-medium">Esta seção é restrita à administração.</p>;
}

function Shell() {
  const { actor, service, campaigns, campaignId, setCampaignId, activeCampaignId, error, campaign } = useAdmin();
  const items = [
    { to: '/admin', label: 'Painel', icon: LayoutDashboard, end: true, show: true },
    { to: '/admin/participantes', label: 'Participantes', icon: Users, show: true },
    { to: '/admin/apadrinhamentos', label: 'Apadrinhamentos', icon: Gift, show: true },
    { to: '/admin/padrinhos', label: 'Padrinhos', icon: ClipboardList, show: true },
    { to: '/admin/contribuicoes', label: 'Contribuições Pix', icon: HandCoins, show: true },
    { to: '/admin/importacao', label: 'Importação', icon: FileUp, show: can.importSpreadsheet(actor.role) },
    { to: '/admin/relatorios', label: 'Relatórios', icon: FileDown, show: true },
    { to: '/admin/campanhas', label: 'Campanhas', icon: Megaphone, show: can.manageCampaigns(actor.role) },
    { to: '/admin/historico', label: 'Histórico', icon: History, show: can.viewAudit(actor.role) },
  ].filter((i) => i.show);
  return (
    <div className="min-h-[100dvh] bg-cream">
      <DemoBanner />
      <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 lg:px-6">
          <Link to="/admin" className="flex items-center gap-2"><Logo className="h-9 w-9 rounded-full object-contain ring-1 ring-line" /><span className="font-display text-lg font-semibold text-burgundy">Painel MK</span></Link>
          <label className="ml-auto flex items-center gap-2 text-sm">
            <span className="hidden text-muted sm:inline">Campanha</span>
            <select className="field !min-h-9 !py-1.5" value={campaignId ?? ''} onChange={(e) => setCampaignId(e.target.value)} data-testid="admin-campaign">
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}{c.id === activeCampaignId ? ' (ativa)' : ''}{c.status === 'archived' ? ' — arquivada' : ''}</option>)}
            </select>
          </label>
          <span className="chip" title={actor.email}>{actor.role === 'admin' ? 'Administrador' : 'Operador'}</span>
          <button className="btn-ghost btn-sm" onClick={() => service.auth.signOut()}><LogOut className="h-4 w-4" aria-hidden="true" />Sair</button>
        </div>
        <nav aria-label="Seções administrativas" className="flex gap-1 overflow-x-auto px-3 pb-2 lg:px-5">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium ${isActive ? 'bg-burgundy text-cream' : 'text-graphite hover:bg-cream-200'}`}>
              <i.icon className="h-4 w-4" aria-hidden="true" />{i.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="px-4 py-6 lg:px-6" id="conteudo">
        {campaign && campaign.status === 'archived' && <p className="mb-4 rounded-xl bg-yellow/20 px-4 py-2 text-sm font-medium">Campanha arquivada: registros históricos preservados. Evite alterações.</p>}
        {error && <p role="alert" className="mb-4 rounded-xl bg-red/5 px-4 py-2 text-sm font-medium text-red">{error}</p>}
        <Suspense fallback={<p className="text-muted" role="status"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Carregando…</p>}>
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="participantes" element={<Participants />} />
            <Route path="apadrinhamentos" element={<Sponsorships />} />
            <Route path="padrinhos" element={<Sponsors />} />
            <Route path="contribuicoes" element={<Contributions />} />
            <Route path="importacao" element={can.importSpreadsheet(actor.role) ? <ImportPage /> : <Forbidden />} />
            <Route path="relatorios" element={<Reports />} />
            <Route path="campanhas" element={can.manageCampaigns(actor.role) ? <Campaigns /> : <Forbidden />} />
            <Route path="historico" element={can.viewAudit(actor.role) ? <Audit /> : <Forbidden />} />
            <Route path="*" element={<p>Seção não encontrada.</p>} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default function AdminApp() {
  const { service, serviceError } = useData();
  const auth = useAuthState();
  if (serviceError) return <div className="grid min-h-[100dvh] place-items-center p-6"><p role="alert" className="card-surface max-w-md p-6 text-center">{serviceError}</p></div>;
  if (!service || auth.status === 'loading') return <div className="grid min-h-[100dvh] place-items-center text-muted" role="status"><BarChart3 className="mb-2 h-6 w-6" aria-hidden="true" />Verificando acesso…</div>;
  if (auth.status === 'signedOut') return <Login />;
  if (auth.status === 'denied') return <Denied email={auth.email} />;
  return <AdminProvider service={service} actor={auth.user}><Shell /></AdminProvider>;
}
