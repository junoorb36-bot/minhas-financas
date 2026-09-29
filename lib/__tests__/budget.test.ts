import { describe, expect, it } from 'vitest';
import { situacaoOrcamento, statusOrcamento } from '@/lib/budget';
import { Budget } from '@/lib/types';

const b = (categoria: string, limite: number): Budget => ({ id: categoria, month: '2026-09', categoria, limite });

describe('statusOrcamento', () => {
  it('verde abaixo de 80% do limite', () => {
    expect(statusOrcamento(0, 500)).toBe('ok');
    expect(statusOrcamento(399.99, 500)).toBe('ok');
  });
  it('alerta de 80% até o limite, inclusive', () => {
    expect(statusOrcamento(400, 500)).toBe('alerta');
    expect(statusOrcamento(500, 500)).toBe('alerta');
  });
  it('estourou acima do limite', () => {
    expect(statusOrcamento(500.01, 500)).toBe('estourou');
  });
});

describe('situacaoOrcamento', () => {
  it('só categorias com limite, mais críticas primeiro, com o percentual gasto', () => {
    const r = situacaoOrcamento(
      [b('Moradia', 1800), b('Lanche', 500), b('Saúde', 600), b('Zerada', 0)],
      { Moradia: 1800, Lanche: 1616.17, Saúde: 120, Lazer: 900 },
    );
    expect(r.map(x => [x.categoria, x.pct, x.status])).toEqual([
      ['Lanche', 323, 'estourou'],
      ['Moradia', 100, 'alerta'],
      ['Saúde', 20, 'ok'],
    ]);
  });
  it('categoria com limite e sem gasto fica em 0%', () => {
    expect(situacaoOrcamento([b('Educação', 200)], {})[0]).toMatchObject({ gasto: 0, pct: 0, status: 'ok' });
  });
});
