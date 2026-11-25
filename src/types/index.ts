export type Role = 'admin' | 'operator';

export interface StaffUser {
  uid: string;
  email: string;
  role: Role;
  displayName?: string;
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'denied'; email: string }
  | { status: 'staff'; user: StaffUser };

export type CampaignStatus = 'draft' | 'active' | 'closed' | 'archived';

export interface PixConfig {
  key: string;
  beneficiary: string;
}

export interface Campaign {
  id: string;
  year: number;
  name: string;
  status: CampaignStatus;
  heroTitle: string;
  heroMessage: string;
  institutionalMessage: string;
  guidelines: string[];
  startsAt?: string;
  endsAt?: string;
  deliveryInfo?: string;
  contactEmail?: string;
  contactPhone?: string;
  pix: PixConfig;
  eligibleCategories: string[];
  createdAt?: string;
  updatedAt?: string;
}

/** Documento PÚBLICO (nenhum dado pessoal sensível). */
export interface PublicParticipant {
  id: string;
  campaignId: string;
  displayName: string;
  category: string;
  age: number | null;
  group: string;
  clothingSize: string;
  shoeSize: string;
  giftSuggestion: string;
  photoUrl?: string;
  photoData?: string;
  published: boolean;
  sponsored: boolean;
  sponsoredAt?: string;
}

/** Documento PRIVADO (somente equipe autenticada). */
export interface PrivateParticipant {
  id: string;
  campaignId: string;
  fullName: string;
  displayName: string;
  category: string;
  age: number | null;
  ageRaw: string;
  group: string;
  clothingSize: string;
  shoeSize: string;
  giftSuggestion: string;
  photoSource?: string;
  photoUrl?: string;
  photoData?: string;
  publicationAuthorized: boolean;
  published: boolean;
  archived: boolean;
  importJobId?: string;
  sourceRow?: number;
  sourceTimestamp?: string;
  dedupeKey: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ParticipantInput = Omit<PrivateParticipant, 'id' | 'campaignId' | 'createdAt' | 'updatedAt'> & { id?: string };

export type SponsorshipStatus = 'confirmed' | 'contacted' | 'received' | 'delivered';

export interface Sponsorship {
  id: string; // = participantId (unicidade garantida pelo ID do documento)
  campaignId: string;
  participantId: string;
  participantDisplayName: string;
  sponsorName: string;
  sponsorPhone: string; // dígitos com DDI: 55DDDNNNNNNNNN
  protocol: string;
  status: SponsorshipStatus;
  consent: true;
  adminNotes?: string;
  createdAt?: string;
  statusChangedAt?: string;
  contactedAt?: string;
  receivedAt?: string;
  deliveredAt?: string;
}

export interface SponsorshipHistoryItem extends Omit<Sponsorship, 'status'> {
  status: SponsorshipStatus | 'cancelled';
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
}

export interface Contribution {
  id: string;
  campaignId: string;
  amountCents: number;
  contributorName?: string;
  note?: string;
  receivedOn: string; // yyyy-mm-dd
  createdBy?: string;
  createdAt?: string;
}

export interface ImportJob {
  id: string;
  campaignId: string;
  fileName: string;
  total: number;
  created: number;
  skippedDuplicates: number;
  invalid: number;
  actorEmail: string;
  createdAt?: string;
}

export interface AuditLog {
  id: string;
  campaignId: string;
  actorUid: string;
  actorEmail: string;
  role: Role;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  createdAt?: string;
}

export interface ImportRecord extends Omit<ParticipantInput, 'id'> {}

export interface SponsorInput {
  campaignId: string;
  participantId: string;
  sponsorName: string;
  sponsorPhone: string; // máscara ou dígitos; o serviço normaliza
  consent: boolean;
}

export type SponsorFailure = 'already' | 'closed' | 'invalid' | 'network' | 'unknown';
export type SponsorResult =
  | { ok: true; protocol: string; participantId: string; participantDisplayName: string }
  | { ok: false; code: SponsorFailure; message: string };

export class ServiceError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
