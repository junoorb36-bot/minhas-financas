import { describe, expect, it } from 'vitest';
import { gastosPorCategoria, monthTotals } from '@/lib/totals';
import { Transaction } from '@/lib/types';

function tx(p: Partial<Transaction>): Transaction {
  return {
    id: 'x', month: '2026-07', type: 'fixo', descricao: 'T', valor: 100, categoria: 'Moradia',
    dia_vencimento: null, pago: false, cartao: false, parcela: null, parcelas: null, grupo: null, ...p,
  };
}

const txs: Transaction[] = [
  tx({ type: 'entrada', valor: 3000, categoria: null }),
  tx({ type: 'fixo', valor: 800, categoria: 'Moradia' }),
  tx({ type: 'fixo', valor: 327.78, categoria: 'Transporte', cartao: true }),
  tx({ type: 'variavel', valor: 200, categoria: 'Alimentação' }),
  tx({ type: 'variavel', valor: 50.5, categoria: 'Lazer', cartao: true }),
];

describe('monthTotals', () => {
  it('soma entradas, fixos e variáveis', () => {
    const t = monthTotals(txs);
    expect(t.entradas).toBe(3000);
    expect(t.fixos).toBe(1127.78);
    expect(t.variaveis).toBe(250.5);
    expect(t.saidas).toBe(1378.28);
    expect(t.saldo).toBe(1621.72);
  });
  it('separa a parte paga no cartão', () => {
    expect(monthTotals(txs).cartao).toEqual({ fixos: 327.78, variaveis: 50.5, total: 378.28 });
  });
  it('mês sem nada no cartão', () => {
    expect(monthTotals([tx({ valor: 10 })]).cartao.total).toBe(0);
  });
});

describe('gastosPorCategoria', () => {
  it('soma saídas por categoria, dentro e fora do cartão; entradas ficam de fora', () => {
    const g = gastosPorCategoria(txs);
    expect(g['Moradia']).toBe(800);
    expect(g['Transporte']).toBe(327.78);
    expect(g['Lazer']).toBe(50.5);
    expect(Object.keys(g)).toHaveLength(4);
  });
  it('usa "Outros" quando a categoria é nula', () => {
    const g = gastosPorCategoria([tx({ type: 'variavel', categoria: null, valor: 40 })]);
    expect(g['Outros']).toBe(40);
  });
});
