/**
 * Dados 100% SINTÉTICOS para o ambiente de demonstração e testes.
 * Nomes fictícios e avatares ilustrativos gerados em SVG — nenhuma
 * pessoa real, nenhuma fotografia real.
 */
import type { Campaign, PrivateParticipant, PublicParticipant, Sponsorship, SponsorshipHistoryItem } from '@/types';
import { CAMPAIGN_TEXTS, DEFAULT_PIX, FALLBACK_CATEGORIES } from '@/config/campaign';
import { dedupeKeyOf, displayNameFrom } from '@/lib/text';
import { toPublicFields } from './shared';

const AVATAR_BG = ['#F3E3C3', '#E8D5D0', '#D8E4DA', '#F1E6D2', '#E4DCEB', '#DCE7EE'];
const AVATAR_FG = ['#70252B', '#204D38', '#8A6A1F', '#B5222D', '#3B4A6B', '#5B3A29'];

/** Avatar ilustrativo abstrato (silhueta), claramente não fotográfico. */
export function syntheticAvatar(seed: number): string {
  const bg = AVATAR_BG[seed % AVATAR_BG.length];
  const fg = AVATAR_FG[(seed * 7) % AVATAR_FG.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><rect width="400" height="500" fill="${bg}"/><circle cx="200" cy="215" r="62" fill="${fg}" opacity=".28"/><path d="M95 500c8-95 55-150 105-150s97 55 105 150z" fill="${fg}" opacity=".28"/><text x="200" y="470" font-family="Georgia,serif" font-size="22" fill="${fg}" opacity=".55" text-anchor="middle">ilustração fictícia</text><g fill="#C5A059" opacity=".55"><circle cx="${60 + (seed % 5) * 60}" cy="60" r="6"/><circle cx="${340 - (seed % 4) * 50}" cy="96" r="4"/></g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const FIRST = ['Lia', 'Theo', 'Nina', 'Davi', 'Iara', 'Caio', 'Maya', 'Joaquim', 'Alice', 'Bento', 'Luna', 'Ravi', 'Clara', 'Otto', 'Bia', 'Ícaro', 'Zoe', 'Heitor', 'Lívia', 'Tomé', 'Sol', 'Raul', 'Íris', 'Vicente'];
const LAST = ['Aurora Exemplo', 'Fictício Silva', 'Demonstração Souza', 'Teste Lima', 'Amostra Rocha', 'Simulado Costa'];
const GROUPS = ['Bateria', 'Percussão', 'Pandeiro', 'Violão', 'Guitarra / Contra-baixo', 'Violino', 'Cavaquinho', 'Flauta Doce', 'Flauta Transversal'];
const CLOTHES = ['10', '12', '14', 'P', 'M', 'G', 'GG', 'P adulto', 'M / 42'];
const SHOES = ['30', '32', '34', '36', '38', '38/39', '40', '42', '43'];
const GIFTS = ['Estante de partitura', 'Capa para instrumento', 'Livro de histórias', 'Jogo de cordas', 'Mochila', 'Fone de ouvido', '', 'Kit de material escolar', 'Camiseta', ''];

export function campaignFor(year: number, status: Campaign['status']): Campaign {
  return {
    id: String(year),
    year,
    name: `Apadrinhamento de Natal ${year}`,
    status,
    heroTitle: `Apadrinhamento de Natal ${year}`,
    heroMessage: CAMPAIGN_TEXTS.mainMessage,
    institutionalMessage: CAMPAIGN_TEXTS.institutionalMessage,
    guidelines: [...CAMPAIGN_TEXTS.guidelines],
    deliveryInfo: '',
    pix: { ...DEFAULT_PIX },
    eligibleCategories: [...FALLBACK_CATEGORIES],
    createdAt: new Date(`${year}-10-01T12:00:00Z`).toISOString(),
  };
}

export interface DemoSeed {
  campaigns: Record<string, Campaign>;
  participants: Record<string, Record<string, PrivateParticipant>>;
  publicParticipants: Record<string, Record<string, PublicParticipant>>;
  sponsorships: Record<string, Record<string, Sponsorship>>;
  history: Record<string, SponsorshipHistoryItem[]>;
}

export function buildSeed(): DemoSeed {
  const seed: DemoSeed = {
    campaigns: { '2025': campaignFor(2025, 'archived'), '2026': campaignFor(2026, 'active') },
    participants: { '2025': {}, '2026': {} },
    publicParticipants: { '2025': {}, '2026': {} },
    sponsorships: { '2025': {}, '2026': {} },
    history: { '2025': [], '2026': [] },
  };
  const make = (cid: string, i: number, opts: { published: boolean; sponsored: boolean; photo: boolean }) => {
    const fullName = `${FIRST[i % FIRST.length]} ${LAST[i % LAST.length]}`;
    const category = i % 7 === 3 ? 'Voluntário' : i % 11 === 5 ? 'Professor(a)' : 'Aluno';
    const age = category === 'Aluno' ? 6 + ((i * 5) % 12) : 19 + ((i * 7) % 45);
    const id = `demo-${cid}-${String(i + 1).padStart(3, '0')}`;
    const p: PrivateParticipant = {
      id, campaignId: cid, fullName, displayName: displayNameFrom(fullName), category, age, ageRaw: String(age),
      group: GROUPS[i % GROUPS.length], clothingSize: CLOTHES[i % CLOTHES.length], shoeSize: SHOES[(i * 3) % SHOES.length],
      giftSuggestion: GIFTS[i % GIFTS.length], publicationAuthorized: opts.published, published: opts.published,
      archived: false, dedupeKey: '', photoData: opts.photo ? syntheticAvatar(i) : undefined,
      createdAt: new Date(Date.UTC(Number(cid), 9, 10 + (i % 15))).toISOString(),
    };
    p.dedupeKey = dedupeKeyOf(p.fullName, p.age, p.group);
    seed.participants[cid][id] = p;
    if (opts.published) {
      seed.publicParticipants[cid][id] = { id, ...toPublicFields(p), published: true, sponsored: opts.sponsored };
    }
    if (opts.sponsored) {
      seed.sponsorships[cid][id] = {
        id, campaignId: cid, participantId: id, participantDisplayName: p.displayName,
        sponsorName: `Padrinho Fictício ${i + 1}`, sponsorPhone: `552199999${String(1000 + i).slice(-4)}`,
        protocol: `MK${cid.slice(2)}-DEMO${String(1000 + i).slice(-4).replace(/[01]/g, 'Z')}`,
        status: i % 2 === 0 ? 'received' : 'confirmed', consent: true,
        createdAt: new Date(Date.UTC(Number(cid), 10, 1 + (i % 20), 15)).toISOString(),
      };
    }
  };
  // 2026: 24 participantes; 20 publicados (6 já apadrinhados), 4 rascunhos aguardando autorização
  for (let i = 0; i < 24; i++) make('2026', i, { published: i < 20, sponsored: i < 20 && i % 3 === 1, photo: i % 5 !== 4 });
  // 2025: histórico encerrado (todos apadrinhados)
  for (let i = 0; i < 6; i++) make('2025', i + 30, { published: true, sponsored: true, photo: false });
  return seed;
}
