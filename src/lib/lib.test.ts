import { maskPhone, isValidBrPhone, toStoredPhone, formatStoredPhone } from './phone';
import { displayNameFrom, parseAge, normalizeCategory, dedupeKeyOf } from './text';
import { generateProtocol, PROTOCOL_RE } from './protocol';
import { sanitizeCell, escapeHtml } from './csvSafe';
import { filterParticipants, EMPTY_FILTERS, ageBandOf } from './filters';
import { computeStats } from './stats';
import { PIX_INTRO, DEFAULT_PIX, pixKeyLine } from '@/config/campaign';
import type { PublicParticipant } from '@/types';

describe('Pix — requisito inegociável', () => {
  it('mantém exatamente os textos e valores fornecidos', () => {
    expect(PIX_INTRO).toBe('Se preferir, você também pode contribuir com qualquer valor via Pix.');
    expect(pixKeyLine(DEFAULT_PIX)).toBe('Chave Pix: 07152890714 - Ana Claudia Cloves');
  });
});

describe('telefone', () => {
  it('aplica máscara e valida celular/fixo com DDD', () => {
    expect(maskPhone('21987654321')).toBe('(21) 98765-4321');
    expect(maskPhone('2122223333')).toBe('(21) 2222-3333');
    expect(isValidBrPhone('(21) 98765-4321')).toBe(true);
    expect(isValidBrPhone('+55 21 98765-4321')).toBe(true);
    expect(isValidBrPhone('21 8765-432')).toBe(false);
    expect(isValidBrPhone('(21) 88765-4321')).toBe(false); // celular deve começar com 9
    expect(isValidBrPhone('(01) 98765-4321')).toBe(false);
    expect(toStoredPhone('(21) 98765-4321')).toBe('5521987654321');
    expect(formatStoredPhone('5521987654321')).toBe('(21) 98765-4321');
  });
});

describe('texto', () => {
  it('gera nome de exibição minimizado preservando acentos', () => {
    expect(displayNameFrom('Ícaro de Souza Araújo')).toBe('Ícaro A.');
    expect(displayNameFrom('  Maria  ')).toBe('Maria');
    expect(displayNameFrom('João da')).toBe('João');
  });
  it('interpreta idade e categoria', () => {
    expect(parseAge('9 anos')).toBe(9);
    expect(parseAge('abc')).toBeNull();
    expect(parseAge('300')).toBeNull();
    expect(normalizeCategory('Professor (a)')).toBe('Professor(a)');
    expect(normalizeCategory('voluntária')).toBe('Voluntário');
    expect(normalizeCategory('Responsável')).toBe('Responsável');
  });
  it('chave de duplicidade não usa somente o nome', () => {
    expect(dedupeKeyOf('Ana Luiza', 10, 'Violão')).not.toBe(dedupeKeyOf('Ana Luiza', 12, 'Violão'));
  });
});

describe('protocolo', () => {
  it('segue o formato validado pelas regras', () => {
    for (let i = 0; i < 50; i++) expect(generateProtocol(2026)).toMatch(PROTOCOL_RE);
    expect(generateProtocol(2026).startsWith('MK26-')).toBe(true);
  });
});

describe('segurança de exportação e HTML', () => {
  it('neutraliza injeção de fórmulas', () => {
    expect(sanitizeCell('=HYPERLINK("x")')).toBe(`'=HYPERLINK("x")`);
    expect(sanitizeCell('+5521')).toBe(`'+5521`);
    expect(sanitizeCell('-1')).toBe(`'-1`);
    expect(sanitizeCell('@SUM(A1)')).toBe(`'@SUM(A1)`);
    expect(sanitizeCell(42)).toBe(42);
    expect(sanitizeCell('Violão')).toBe('Violão');
  });
  it('escapa HTML', () => expect(escapeHtml('<img onerror=x>')).toBe('&lt;img onerror=x&gt;'));
});

const P = (o: Partial<PublicParticipant>): PublicParticipant => ({ id: Math.random().toString(), campaignId: '2026', displayName: 'X', category: 'Aluno', age: 10, group: 'Violão', clothingSize: '', shoeSize: '', giftSuggestion: '', published: true, sponsored: false, ...o });
describe('filtros e indicadores', () => {
  const list = [P({ displayName: 'Ícaro A.', age: 8 }), P({ displayName: 'Bia S.', age: 30, category: 'Voluntário', sponsored: true }), P({ displayName: 'Ana L.', age: 15, group: 'Violino' })];
  it('busca ignorando acentos e filtra', () => {
    expect(filterParticipants(list, { ...EMPTY_FILTERS, search: 'icaro' }).map((p) => p.displayName)).toEqual(['Ícaro A.']);
    expect(filterParticipants(list, { ...EMPTY_FILTERS, availability: 'available' })).toHaveLength(2);
    expect(filterParticipants(list, { ...EMPTY_FILTERS, category: 'Voluntário' })).toHaveLength(1);
    expect(filterParticipants(list, { ...EMPTY_FILTERS, group: 'Violino' })).toHaveLength(1);
    expect(filterParticipants(list, { ...EMPTY_FILTERS, ageBand: 'teens' })).toHaveLength(1);
    expect(filterParticipants(list, { ...EMPTY_FILTERS, sort: 'ageAsc' }).map((p) => p.age)).toEqual([8, 15, 30]);
    expect(ageBandOf(null)).toBe('');
  });
  it('calcula indicadores reais', () => {
    expect(computeStats(list)).toEqual({ total: 3, sponsored: 1, available: 2, percent: 33 });
    expect(computeStats([])).toEqual({ total: 0, sponsored: 0, available: 0, percent: 0 });
  });
});

import { standardizeName } from './text';
describe('padronização de nomes', () => {
  it('iniciais maiúsculas, partículas minúsculas, sem ponto final', () => {
    expect(standardizeName('MARIANA ALVES')).toBe('Mariana Alves');
    expect(standardizeName('Kamilly  vitória ')).toBe('Kamilly Vitória');
    expect(standardizeName('Guilherme França da Costa Valério de Souza.')).toBe('Guilherme França da Costa Valério de Souza');
    expect(standardizeName("Aghata D'Eleutério Borges")).toBe("Aghata D'Eleutério Borges");
    expect(standardizeName('Kayo de Farias lemos de Oliveira')).toBe('Kayo de Farias Lemos de Oliveira');
    expect(standardizeName('Íris')).toBe('Íris');
  });
});

import { campaignGuidelines, cleanInstitutional } from '@/config/campaign';
describe('campanha sem presente sugerido', () => {
  it('remove menções salvas na campanha', () => {
    expect(campaignGuidelines(['O presente sugerido é uma orientação, não uma obrigação.', 'Não há valor mínimo.'])).toEqual(['Não há valor mínimo.']);
    expect(cleanInstitutional('O Natal é tempo de amor. Não precisa ser exatamente o que foi pedido. O que vale é o cuidado.')).toBe('O Natal é tempo de amor. O que vale é o cuidado.');
    expect(campaignGuidelines(undefined).some((g) => /sugerido/i.test(g))).toBe(false);
  });
});
