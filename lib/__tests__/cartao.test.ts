import { describe, expect, it } from 'vitest';
import { evolucaoCartao, gerarParcelas, limiteUsado, variacaoPercentual } from '@/lib/cartao';
import { Transaction } from '@/lib/types';

function tx(p: Partial<Transaction>): Transaction {
  return {
    id: 'x', month: '2026-08', type: 'variavel', descricao: 'T', valor: 100, categoria: 'Outros',
    dia_vencimento: 1, pago: false, cartao: true, parcela: null, parcelas: null, grupo: null, ...p,
  };
}

const card = { dia_fechamento: 4, dia_vencimento: 12 };

describe('gerarParcelas', () => {
  it('compra à vista sem cartão configurado cai no mês que está sendo visto', () => {
    expect(gerarParcelas({ valorTotal: 50, parcelas: 1, dataCompra: '2026-07-20', mesBase: '2026-08', card: null }))
      .toEqual([{ month: '2026-08', dia: 20, valor: 50, parcela: 1 }]);
  });
  it('com cartão configurado, usa o fechamento para achar a fatura', () => {
    // fecha dia 4: compra em 20/07 entra na fatura que vence em agosto
    expect(gerarParcelas({ valorTotal: 50, parcelas: 1, dataCompra: '2026-07-20', mesBase: '2026-10', card })[0].month).toBe('2026-08');
    // compra em 03/08 ainda entra na fatura de agosto
    expect(gerarParcelas({ valorTotal: 50, parcelas: 1, dataCompra: '2026-08-03', mesBase: '2026-10', card })[0].month).toBe('2026-08');
  });
  it('parcelado: uma parcela por mês, centavos na última', () => {
    const p = gerarParcelas({ valorTotal: 1000, parcelas: 3, dataCompra: '2026-08-10', mesBase: '2026-08', card: null });
    expect(p.map(x => x.month)).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(p.map(x => x.valor)).toEqual([333.33, 333.33, 333.34]);
    expect(p.map(x => x.parcela)).toEqual([1, 2, 3]);
    expect(p.every(x => x.dia === 10)).toBe(true);
  });
  it('sem data da compra fica sem dia', () => {
    expect(gerarParcelas({ valorTotal: 50, parcelas: 1, dataCompra: null, mesBase: '2026-08', card })[0])
      .toEqual({ month: '2026-08', dia: null, valor: 50, parcela: 1 });
  });
});

describe('limiteUsado', () => {
  it('soma itens do cartão ainda não pagos, do mês informado em diante', () => {
    const txs = [
      tx({ month: '2026-08', valor: 100, pago: true }),
      tx({ month: '2026-09', valor: 200 }),
      tx({ month: '2026-10', valor: 50 }),
      tx({ month: '2026-09', valor: 999, cartao: false }),
      tx({ month: '2026-07', valor: 70 }),
    ];
    expect(limiteUsado(txs, '2026-08')).toBe(250);
    expect(limiteUsado(txs, '2026-10')).toBe(50);
  });
});

describe('evolucaoCartao', () => {
  it('separa fixos e variáveis do cartão por mês', () => {
    const txs = [
      tx({ month: '2026-07', type: 'fixo', valor: 300 }),
      tx({ month: '2026-08', type: 'fixo', valor: 300 }),
      tx({ month: '2026-08', valor: 120 }),
      tx({ month: '2026-08', valor: 500, cartao: false }),
    ];
    expect(evolucaoCartao(['2026-07', '2026-08'], txs)).toEqual([
      { key: '2026-07', fixos: 300, variaveis: 0, total: 300 },
      { key: '2026-08', fixos: 300, variaveis: 120, total: 420 },
    ]);
  });
});

describe('variacaoPercentual', () => {
  it('compara com o mês anterior', () => {
    expect(variacaoPercentual(420, 300)).toBe(40);
    expect(variacaoPercentual(150, 300)).toBe(-50);
  });
  it('sem base de comparação retorna null', () => {
    expect(variacaoPercentual(100, 0)).toBeNull();
  });
});
