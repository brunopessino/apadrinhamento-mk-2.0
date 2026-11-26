import type { PrivateParticipant, PublicParticipant, SponsorInput, SponsorResult } from '@/types';
import { CAMPAIGN_TEXTS } from '@/config/campaign';
import { toStoredPhone } from '@/lib/phone';

/** Projeção privado -> público. Somente campos autorizados saem daqui. */
export function toPublicFields(p: Pick<PrivateParticipant, 'campaignId' | 'displayName' | 'category' | 'age' | 'group' | 'clothingSize' | 'shoeSize' | 'giftSuggestion' | 'photoUrl' | 'photoData'>) {
  const out: Omit<PublicParticipant, 'id' | 'sponsored' | 'published' | 'sponsoredAt'> = {
    campaignId: p.campaignId,
    displayName: p.displayName.trim(),
    category: p.category,
    age: p.age,
    group: p.group,
    clothingSize: p.clothingSize,
    shoeSize: p.shoeSize,
    giftSuggestion: '', // campanha sem presente sugerido: nunca publicado
  };
  if (p.photoUrl) out.photoUrl = p.photoUrl;
  if (p.photoData) out.photoData = p.photoData;
  return out;
}

export interface ValidSponsor {
  sponsorName: string;
  sponsorPhone: string;
}

export function validateSponsorInput(input: SponsorInput): ValidSponsor | SponsorResult {
  const name = input.sponsorName.replace(/\s+/g, ' ').trim();
  const phone = toStoredPhone(input.sponsorPhone);
  if (name.length < 2 || name.length > 80) return { ok: false, code: 'invalid', message: 'Informe seu nome (2 a 80 caracteres).' };
  if (!phone) return { ok: false, code: 'invalid', message: 'Informe um WhatsApp válido com DDD.' };
  if (!input.consent) return { ok: false, code: 'invalid', message: 'É necessário concordar com o tratamento dos dados.' };
  return { sponsorName: name, sponsorPhone: phone };
}

export const failure = {
  already: (): SponsorResult => ({ ok: false, code: 'already', message: CAMPAIGN_TEXTS.conflict }),
  closed: (): SponsorResult => ({ ok: false, code: 'closed', message: 'A campanha não está aceitando apadrinhamentos no momento.' }),
  network: (): SponsorResult => ({ ok: false, code: 'network', message: 'Não foi possível confirmar por instabilidade de conexão. Nada foi registrado; tente novamente.' }),
  unknown: (): SponsorResult => ({ ok: false, code: 'unknown', message: 'Não foi possível confirmar agora. Tente novamente em instantes.' }),
  invalid: (m: string): SponsorResult => ({ ok: false, code: 'invalid', message: m }),
};
