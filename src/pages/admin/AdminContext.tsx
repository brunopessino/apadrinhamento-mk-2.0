import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuditLog, Campaign, Contribution, ImportJob, PrivateParticipant, Sponsorship, SponsorshipHistoryItem, StaffUser } from '@/types';
import type { DataService } from '@/services/data/types';

export interface AdminData {
  service: DataService;
  actor: StaffUser;
  campaigns: Campaign[];
  activeCampaignId: string | null;
  campaignId: string | null;
  setCampaignId: (id: string) => void;
  campaign: Campaign | null;
  participants: PrivateParticipant[];
  sponsorships: Sponsorship[];
  history: SponsorshipHistoryItem[];
  contributions: Contribution[];
  importJobs: ImportJob[];
  audit: AuditLog[];
  loading: boolean;
  error: string | null;
}

const Ctx = createContext<AdminData | null>(null);
export const useAdmin = () => { const c = useContext(Ctx); if (!c) throw new Error('useAdmin fora do provider'); return c; };

const permissionMsg = (e: Error) =>
  /permission|insufficient/i.test(e.message) ? 'Sua sessão não tem permissão para estes dados ou expirou. Entre novamente.' : 'Falha de conexão ao carregar dados administrativos.';

export function AdminProvider({ service, actor, children }: { service: DataService; actor: StaffUser; children: ReactNode }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaignId, setActive] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<PrivateParticipant[]>([]);
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [history, setHistory] = useState<SponsorshipHistoryItem[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onErr = (e: Error) => setError(permissionMsg(e));

  useEffect(() => {
    const a = service.admin.subscribeCampaigns(setCampaigns, onErr);
    const b = service.admin.subscribeActiveCampaignId((id) => { setActive(id); setCampaignId((cur) => cur ?? id); }, onErr);
    return () => { a(); b(); };
  }, [service]);

  useEffect(() => {
    if (!campaignId && campaigns.length) setCampaignId(campaigns[0].id);
  }, [campaigns, campaignId]);

  useEffect(() => {
    if (!campaignId) return;
    setLoading(true); setError(null);
    const A = service.admin;
    const subs = [
      A.subscribeParticipants(campaignId, (v) => { setParticipants(v); setLoading(false); }, onErr),
      A.subscribeSponsorships(campaignId, setSponsorships, onErr),
      A.subscribeSponsorshipHistory(campaignId, setHistory, onErr),
      A.subscribeContributions(campaignId, setContributions, onErr),
      A.subscribeImportJobs(campaignId, setImportJobs, onErr),
      ...(actor.role === 'admin' ? [A.subscribeAudit(campaignId, setAudit, onErr)] : []),
    ];
    return () => subs.forEach((u) => u());
  }, [service, campaignId, actor.role]);

  const campaign = campaigns.find((c) => c.id === campaignId) ?? null;
  return (
    <Ctx.Provider value={{ service, actor, campaigns, activeCampaignId, campaignId, setCampaignId, campaign, participants, sponsorships, history, contributions, importJobs, audit, loading, error }}>
      {children}
    </Ctx.Provider>
  );
}

/** Executa uma ação administrativa com estado de carregamento e mensagem de erro. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  async function run(fn: () => Promise<unknown>, ok?: string) {
    setBusy(true); setMsg(null);
    try { await fn(); if (ok) setMsg({ type: 'ok', text: ok }); return true; }
    catch (e) {
      const m = (e as Error).message || 'Falha inesperada.';
      setMsg({ type: 'error', text: /permission|insufficient/i.test(m) ? 'Permissão negada para esta operação.' : m });
      return false;
    } finally { setBusy(false); }
  }
  return { busy, msg, setMsg, run };
}

export function Feedback({ msg }: { msg: { type: 'ok' | 'error'; text: string } | null }) {
  if (!msg) return null;
  return <p role={msg.type === 'error' ? 'alert' : 'status'} className={`rounded-xl px-3 py-2 text-sm font-medium ${msg.type === 'error' ? 'bg-red/5 text-red' : 'bg-pine/10 text-pine'}`}>{msg.text}</p>;
}
