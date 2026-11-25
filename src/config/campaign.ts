/**
 * Configuração centralizada: textos, links institucionais, Pix e créditos.
 * Nenhum valor aqui é duplicado em componentes.
 */
import type { PixConfig } from '@/types';

export const INSTITUTION = {
  name: 'Meu Kantinho Centro de Cultura',
  shortName: 'Meu Kantinho',
  founded: 1998,
  founder: 'Cloves do Violão',
  site: 'https://www.meukantinho.com.br/',
  instagram: 'https://www.instagram.com/meukantinho_oficial/',
  logo: `${import.meta.env.BASE_URL}brand/logo-mk.png`,
  contactEmail: (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) ?? '',
  contactPhone: (import.meta.env.VITE_CONTACT_PHONE as string | undefined) ?? '',
  about:
    'Fundado em 1998 por Cloves do Violão, o Meu Kantinho Centro de Cultura promove inclusão social, educação musical, convivência comunitária e transformação por meio da cultura.',
} as const;

/** Mensagem Pix exigida em TODOS os cards. Não alterar sem autorização da organização. */
export const PIX_INTRO = 'Se preferir, você também pode contribuir com qualquer valor via Pix.';

/** Valores fornecidos pela organização — mantidos exatamente como recebidos. */
export const DEFAULT_PIX: PixConfig = {
  key: '07152890714',
  beneficiary: 'Ana Claudia Cloves',
};

export const pixKeyLine = (pix: PixConfig) => `Chave Pix: ${pix.key} - ${pix.beneficiary}`;

export const CAMPAIGN_TEXTS = {
  mainMessage: 'Compartilhe amor e veja o Natal se multiplicar em sorrisos.',
  heroTitle: 'Apadrinhamento de Natal 2026',
  institutionalMessage:
    'O Natal é tempo de amor, de carinho e de gestos que aquecem o coração. Você pode apadrinhar um participante e presentear com o que puder. Não precisa ser exatamente o que foi pedido. O que vale é o cuidado, o afeto e o acolhimento.',
  chain: 'Participe dessa corrente de amor e faça parte dessa magia de Natal.',
  giftNote: 'O presente sugerido é uma orientação, não uma obrigação.',
  steps: [
    { title: 'Escolha um participante', text: 'Navegue pelo catálogo e escolha quem você gostaria de presentear.' },
    { title: 'Confirme seu apadrinhamento', text: 'Informe seu nome e WhatsApp. Não é preciso criar conta.' },
    { title: 'Prepare seu presente com carinho', text: 'Presenteie com o que puder. O cuidado é o que vale.' },
  ],
  guidelines: [
    'O presente sugerido é uma orientação, não uma obrigação.',
    'Você pode presentear conforme as suas possibilidades; não há valor mínimo.',
    'A organização poderá entrar em contato pelo WhatsApp informado para combinar a entrega.',
  ],
  deliveryFallback: 'As informações de entrega dos presentes serão divulgadas pela organização.',
  conflict: 'Este participante acabou de ser apadrinhado. Você ainda pode fazer a diferença escolhendo outra pessoa.',
  confirmedTitle: 'Apadrinhamento confirmado!',
  confirmedMessage: 'Você acaba de tornar o Natal de alguém mais especial.',
  confirmedComplement:
    'Obrigado por fazer parte dessa corrente de amor! Seu gesto ajuda a transformar o Natal em um momento ainda mais especial.',
  goalReached: 'Meta alcançada! Todos os participantes foram apadrinhados. Obrigado por fazer parte dessa corrente de amor!',
} as const;

export const FALLBACK_CATEGORIES = ['Aluno', 'Voluntário', 'Professor(a)'];

export const CREDITS = {
  current: 'Apadrinhamento MK 2.0 — desenvolvido por Bruno Pessino',
  previous: 'Projeto original (2025) por Bruno Pessino',
  repo: 'https://github.com/brunopessino/apadrinhamento-mk',
} as const;

export const SITE_URL = ((import.meta.env.VITE_SITE_URL as string | undefined) ?? '').replace(/\/$/, '');
export const DATA_MODE = (import.meta.env.VITE_DATA_MODE as string | undefined) === 'demo' ? 'demo' : 'firebase';
/** Pré-visualização embutida (ex.: página no claude.ai): roteamento em memória, sem URLs próprias. */
export const IS_EMBED = (import.meta.env.VITE_ROUTER as string | undefined) === 'memory';
export const PHOTO_MODE = (import.meta.env.VITE_PHOTO_MODE as string | undefined) === 'storage' ? 'storage' : 'inline';
