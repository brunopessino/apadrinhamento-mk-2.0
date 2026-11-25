import type { Role } from '@/types';

/** Matriz de permissões (espelhada em firestore.rules). */
export const can = {
  viewPersonalData: (r: Role) => r === 'admin' || r === 'operator',
  exportPersonalData: (r: Role) => r === 'admin',
  publishParticipants: (r: Role) => r === 'admin',
  editPublishedParticipants: (r: Role) => r === 'admin',
  editDraftParticipants: (r: Role) => r === 'admin' || r === 'operator',
  advanceSponsorship: (r: Role) => r === 'admin' || r === 'operator',
  cancelSponsorship: (r: Role) => r === 'admin',
  manageCampaigns: (r: Role) => r === 'admin',
  importSpreadsheet: (r: Role) => r === 'admin',
  registerContribution: (r: Role) => r === 'admin' || r === 'operator',
  deleteContribution: (r: Role) => r === 'admin',
  viewAudit: (r: Role) => r === 'admin',
};
