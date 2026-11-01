import { describe, expect, it } from 'vitest';
import { classificarTendencia, evolucaoPorCategoria } from '@/lib/trend';
import { Transaction } from '@/lib/types';

function tx(month: string, categoria: string, valor: number, type: Transaction['type'] = 'variavel'): Transaction {
  return {
    id: 'x', month, type, descricao: 'T', valor, categoria, dia_vencimento: 1, pago: true,
    cartao: false, parcela: null, parcelas: null, grupo: null,
  };
}

describe('classificarTendencia', () => {
  it('compara com a média, ignorando diferenças pequenas', () => {
    expect(classificarTendencia(600, 1000)).toBe('abaixo');
    expect(classificarTendencia(1500, 1000)).toBe('acima');
    expect(classificarTendencia(1050, 1000)).toBe('na-media'); // 5%
    expect(classificarTendencia(115, 100)).toBe('na-media'); // R$ 15
    expect(classificarTendencia(100, null)).toBe('sem-historico');
  });
});

describe('evolucaoPorCategoria', () => {
  const meses = ['2026-08', '2026-09', '2026-10'];
  const txs = [
    tx('2026-08', 'Lanche', 900), tx('2026-09', 'Lanche', 1600), tx('2026-10', 'Lanche', 600),
    tx('2026-09', 'Lazer', 200),
    tx('2026-10', 'Saúde', 300),
    tx('2026-10', 'Outros', 5000, 'entrada'),
  ];
  const r = evolucaoPorCategoria(txs, meses);

  it('monta a série mês a mês, com zero onde não houve gasto', () => {
    const lazer = r.find(e => e.categoria === 'Lazer')!;
    expect(lazer.serie.map(p => p.total)).toEqual([0, 200, 0]);
  });
  it('média dos meses anteriores e comparação com o mês passado', () => {
    const lanche = r.find(e => e.categoria === 'Lanche')!;
    expect(lanche).toMatchObject({ atual: 600, anterior: 1600, media: 1250, tendencia: 'abaixo' });
  });
  it('ordena pelo gasto do mês de referência e ignora entradas', () => {
    expect(r.map(e => e.categoria)).toEqual(['Lanche', 'Saúde', 'Lazer']);
  });
  it('só um mês: sem histórico para comparar', () => {
    const [unico] = evolucaoPorCategoria([tx('2026-10', 'Lanche', 100)], ['2026-10']);
    expect(unico).toMatchObject({ anterior: null, media: null, tendencia: 'sem-historico' });
  });
});
