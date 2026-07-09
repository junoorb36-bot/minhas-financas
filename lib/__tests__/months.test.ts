import { describe, expect, it } from 'vitest';
import { monthName, shiftMonth, shortMonth, todayKey } from '@/lib/months';

describe('shiftMonth', () => {
  it('avança dentro do ano', () => expect(shiftMonth('2026-07', 1)).toBe('2026-08'));
  it('vira o ano para frente', () => expect(shiftMonth('2026-12', 1)).toBe('2027-01'));
  it('vira o ano para trás', () => expect(shiftMonth('2026-01', -1)).toBe('2025-12'));
  it('aceita deltas grandes', () => expect(shiftMonth('2026-07', 18)).toBe('2028-01'));
});

describe('todayKey', () => {
  it('formata a data como YYYY-MM', () => {
    expect(todayKey(new Date(2026, 6, 9))).toBe('2026-07');
  });
});

describe('nomes', () => {
  it('nome completo capitalizado', () => {
    expect(monthName('2026-07').toLowerCase()).toContain('julho');
    expect(monthName('2026-07')).toContain('2026');
  });
  it('nome curto sem ponto', () => {
    expect(shortMonth('2026-07').toLowerCase().startsWith('jul')).toBe(true);
    expect(shortMonth('2026-07')).not.toContain('.');
  });
});
