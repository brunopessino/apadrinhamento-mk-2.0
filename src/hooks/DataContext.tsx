import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthState, Campaign, PublicParticipant } from '@/types';
import type { DataService } from '@/services/data/types';
import { getDataService } from '@/services/data';

type Load<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; error: string };

interface Ctx {
  service: DataService | null;
  serviceError: string | null;
  campaign: Load<Campaign | null>;
  participants: Load<PublicParticipant[]>;
  online: boolean;
}

const DataCtx = createContext<Ctx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [service, setService] = useState<DataService | null>(null);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<Load<Campaign | null>>({ status: 'loading' });
  const [participants, setParticipants] = useState<Load<PublicParticipant[]>>({ status: 'loading' });
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);

  useEffect(() => {
    getDataService().then(setService).catch((e: Error) => {
      setServiceError(e.message);
      setCampaign({ status: 'error', error: e.message });
      setParticipants({ status: 'error', error: e.message });
    });
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    if (!service) return;
    return service.subscribeActiveCampaign(
      (c) => setCampaign({ status: 'ready', data: c }),
      () => setCampaign({ status: 'error', error: 'Não foi possível carregar a campanha.' }),
    );
  }, [service]);

  const campaignId = campaign.status === 'ready' ? campaign.data?.id : undefined;
  useEffect(() => {
    if (!service) return;
    if (campaign.status === 'ready' && !campaignId) { setParticipants({ status: 'ready', data: [] }); return; }
    if (!campaignId) return;
    setParticipants({ status: 'loading' });
    // Um único listener compartilhado por toda a interface pública.
    return service.subscribePublicParticipants(
      campaignId,
      (list) => setParticipants({ status: 'ready', data: list }),
      () => setParticipants({ status: 'error', error: 'Não foi possível carregar os participantes. Verifique sua conexão.' }),
    );
  }, [service, campaignId, campaign.status]);

  const value = useMemo(() => ({ service, serviceError, campaign, participants, online }), [service, serviceError, campaign, participants, online]);
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function useData(): Ctx {
  const c = useContext(DataCtx);
  if (!c) throw new Error('useData fora do DataProvider');
  return c;
}

export function useAuthState(): AuthState {
  const { service } = useData();
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  useEffect(() => (service ? service.auth.subscribe(setState) : undefined), [service]);
  return state;
}
