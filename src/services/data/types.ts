import type {
  AuditLog, AuthState, Campaign, Contribution, ImportJob, ImportRecord, ParticipantInput, PrivateParticipant,
  PublicParticipant, SponsorInput, SponsorResult, Sponsorship, SponsorshipHistoryItem, SponsorshipStatus, StaffUser,
} from '@/types';

export type Unsub = () => void;
export type OnError = (e: Error) => void;

export interface SponsorshipPatch {
  status?: SponsorshipStatus;
  adminNotes?: string;
}

export interface ImportSummary {
  jobId: string;
  created: number;
}

export interface PhotoPayload {
  /** data URL (modo inline) ou Blob (modo storage) */
  thumbDataUrl: string;
  fullBlob?: Blob;
}

export interface AdminApi {
  subscribeCampaigns(cb: (c: Campaign[]) => void, onError: OnError): Unsub;
  subscribeActiveCampaignId(cb: (id: string | null) => void, onError: OnError): Unsub;
  saveCampaign(c: Campaign, actor: StaffUser): Promise<void>;
  setActiveCampaign(id: string, actor: StaffUser): Promise<void>;

  subscribeParticipants(cid: string, cb: (p: PrivateParticipant[]) => void, onError: OnError): Unsub;
  saveParticipant(cid: string, p: ParticipantInput, actor: StaffUser): Promise<string>;
  setPublished(cid: string, id: string, published: boolean, actor: StaffUser): Promise<void>;
  setArchived(cid: string, id: string, archived: boolean, actor: StaffUser): Promise<void>;
  setPhoto(cid: string, id: string, photo: PhotoPayload | null, actor: StaffUser): Promise<void>;

  subscribeSponsorships(cid: string, cb: (s: Sponsorship[]) => void, onError: OnError): Unsub;
  subscribeSponsorshipHistory(cid: string, cb: (s: SponsorshipHistoryItem[]) => void, onError: OnError): Unsub;
  updateSponsorship(cid: string, pid: string, patch: SponsorshipPatch, actor: StaffUser): Promise<void>;
  /** Cancela e libera o participante novamente (registro movido ao histórico). */
  cancelSponsorship(cid: string, pid: string, reason: string, actor: StaffUser): Promise<void>;

  subscribeContributions(cid: string, cb: (c: Contribution[]) => void, onError: OnError): Unsub;
  addContribution(cid: string, c: Omit<Contribution, 'id' | 'campaignId' | 'createdAt' | 'createdBy'>, actor: StaffUser): Promise<void>;
  removeContribution(cid: string, id: string, actor: StaffUser): Promise<void>;

  importParticipants(cid: string, records: ImportRecord[], meta: { fileName: string; total: number; skippedDuplicates: number; invalid: number }, actor: StaffUser): Promise<ImportSummary>;
  subscribeImportJobs(cid: string, cb: (j: ImportJob[]) => void, onError: OnError): Unsub;

  subscribeAudit(cid: string, cb: (a: AuditLog[]) => void, onError: OnError): Unsub;
}

export interface DataService {
  mode: 'firebase' | 'demo';
  subscribeActiveCampaign(cb: (c: Campaign | null) => void, onError: OnError): Unsub;
  subscribePublicParticipants(cid: string, cb: (p: PublicParticipant[]) => void, onError: OnError): Unsub;
  sponsor(input: SponsorInput): Promise<SponsorResult>;
  auth: {
    subscribe(cb: (s: AuthState) => void): Unsub;
    signIn(email: string, password: string): Promise<void>;
    signOut(): Promise<void>;
  };
  admin: AdminApi;
}
