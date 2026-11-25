import type { PublicParticipant } from '@/types';

export interface CampaignStats {
  total: number;
  available: number;
  sponsored: number;
  percent: number;
}

export function computeStats(list: Pick<PublicParticipant, 'sponsored'>[]): CampaignStats {
  const total = list.length;
  const sponsored = list.filter((p) => p.sponsored).length;
  return { total, sponsored, available: total - sponsored, percent: total === 0 ? 0 : Math.round((sponsored / total) * 100) };
}
