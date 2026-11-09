import type { Brand } from '../forms/brands';

/** A few brands for tests; the real list lives in the database. */
export const TEST_BRANDS: Brand[] = [
  { code: '00', short: 'MULTI', name: 'Several brands', aliases: ['Multiple brands'] },
  { code: '01', short: 'LC', name: 'La Costeña', aliases: ['Costeña', 'La Costeña USA'] },
  { code: '02', name: 'Mexico Rico', aliases: [] },
  { code: '15', short: 'TL', name: 'Tía Lupita', aliases: [] },
  { code: '18', short: 'CT', name: 'Chocomilk', aliases: ['Choco Milk'] },
];
