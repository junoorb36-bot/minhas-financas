import { describe, expect, it } from 'vitest';
import { compararCategorias } from '@/lib/compare';

describe('compararCategorias', () => {
  it('melhoras primeiro (maior economia antes), depois pioras (maior aumento antes)', () => {
    const r = compararCategorias(
      { Lanche: 800, Lazer: 100, Transporte: 2600, Saúde: 900 },
      { Lanche: 1600, Lazer: 300, Transporte: 900, Saúde: 880 },
    );
    expect(r.map(v => [v.categoria, v.status, v.diferenca])).toEqual([
      ['Lanche', 'melhorou', -800],
      ['Lazer', 'melhorou', -200],
      ['Transporte', 'piorou', 1700],
    ]);
  });
  it('ignora mudanças pequenas (menos de R$ 20 ou menos de 10%)', () => {
    expect(compararCategorias({ A: 115, B: 1050 }, { A: 100, B: 1000 })).toEqual([]);
  });
  it('categoria nova conta como piora; categoria que sumiu conta como melhora', () => {
    const r = compararCategorias({ Educação: 300 }, { Dívidas: 500 });
    expect(r.map(v => [v.categoria, v.status, v.pct])).toEqual([['Dívidas', 'melhorou', -100], ['Educação', 'piorou', null]]);
  });
});
