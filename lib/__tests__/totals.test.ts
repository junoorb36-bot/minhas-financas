import { describe, expect, it } from 'vitest';
import { gastosPorCategoria, monthTotals } from '@/lib/totals';
import { InvoiceItem, Transaction } from '@/lib/types';

function tx(p: Partial<Transaction>): Transaction {
  return { id: 'x', month: '2026-07', type: 'fixo', descricao: 'T', valor: 100, categoria: 'Moradia', dia_vencimento: null, pago: false, ...p };
}

const txs: Transaction[] = [
  tx({ type: 'entrada', valor: 3000, categoria: null }),
  tx({ type: 'fixo', valor: 800, categoria: 'Moradia' }),
  tx({ type: 'variavel', valor: 200, categoria: 'Alimentação' }),
];

describe('monthTotals', () => {
  it('inclui a fatura do cartão nas saídas', () => {
    const t = monthTotals(txs, 500);
    expect(t.entradas).toBe(3000);
    expect(t.fixos).toBe(800);
    expect(t.variaveis).toBe(200);
    expect(t.fatura).toBe(500);
    expect(t.saidas).toBe(1500);
    expect(t.saldo).toBe(1500);
  });
  it('funciona sem fatura', () => {
    expect(monthTotals(txs, 0).saidas).toBe(1000);
  });
});

describe('gastosPorCategoria', () => {
  it('soma lançamentos e parcelas do cartão por categoria; entradas ficam de fora', () => {
    const items: InvoiceItem[] = [
      { purchaseId: 'p', descricao: 'Mercado', categoria: 'Alimentação', parcela: 1, parcelas: 1, valor: 150 },
    ];
    const g = gastosPorCategoria(txs, items);
    expect(g['Moradia']).toBe(800);
    expect(g['Alimentação']).toBe(350);
    expect(Object.keys(g)).toHaveLength(2);
  });
  it('usa "Outros" quando a categoria é nula', () => {
    const g = gastosPorCategoria([tx({ type: 'variavel', categoria: null, valor: 40 })], []);
    expect(g['Outros']).toBe(40);
  });
});
