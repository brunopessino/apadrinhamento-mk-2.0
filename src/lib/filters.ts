import type { PublicParticipant } from '@/types';
import { norm } from './text';

export type AgeBand = '' | 'kids' | 'teens' | 'adults' | 'seniors';
export type Availability = '' | 'available' | 'sponsored';
export type SortKey = 'name' | 'ageAsc' | 'ageDesc' | 'availableFirst';

export interface CatalogFilters {
  search: string;
  category: string;
  group: string;
  ageBand: AgeBand;
  availability: Availability;
  sort: SortKey;
}

export const EMPTY_FILTERS: CatalogFilters = { search: '', category: '', group: '', ageBand: '', availability: '', sort: 'name' };

export const AGE_BANDS: { value: AgeBand; label: string }[] = [
  { value: 'kids', label: 'Até 12 anos' },
  { value: 'teens', label: '13 a 17 anos' },
  { value: 'adults', label: '18 a 59 anos' },
  { value: 'seniors', label: '60 anos ou mais' },
];

export function ageBandOf(age: number | null): AgeBand {
  if (age == null) return '';
  if (age <= 12) return 'kids';
  if (age <= 17) return 'teens';
  if (age <= 59) return 'adults';
  return 'seniors';
}

export function filterParticipants(list: PublicParticipant[], f: CatalogFilters): PublicParticipant[] {
  const q = norm(f.search);
  const out = list.filter((p) => {
    if (q && !norm(p.displayName).includes(q)) return false;
    if (f.category && p.category !== f.category) return false;
    if (f.group && p.group !== f.group) return false;
    if (f.ageBand && ageBandOf(p.age) !== f.ageBand) return false;
    if (f.availability === 'available' && p.sponsored) return false;
    if (f.availability === 'sponsored' && !p.sponsored) return false;
    return true;
  });
  const byName = (a: PublicParticipant, b: PublicParticipant) => norm(a.displayName).localeCompare(norm(b.displayName), 'pt-BR');
  const age = (p: PublicParticipant) => p.age ?? Number.POSITIVE_INFINITY;
  switch (f.sort) {
    case 'ageAsc':
      return out.sort((a, b) => age(a) - age(b) || byName(a, b));
    case 'ageDesc':
      return out.sort((a, b) => (b.age ?? -1) - (a.age ?? -1) || byName(a, b));
    case 'availableFirst':
      return out.sort((a, b) => Number(a.sponsored) - Number(b.sponsored) || byName(a, b));
    default:
      return out.sort(byName);
  }
}

export const hasActiveFilters = (f: CatalogFilters) =>
  Boolean(f.search || f.category || f.group || f.ageBand || f.availability);

export const distinct = (values: string[]) =>
  [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
