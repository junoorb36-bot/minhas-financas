import { describe, expect, it } from 'vitest';
import { faturaDoMes, firstInvoiceMonth, limiteUtilizado, parcelaValor } from '@/lib/invoice';
import { Card, CardPurchase } from '@/lib/types';

const cardV = { id: 'c1', nome: 'Cartão', dia_fechamento: 20, dia_vencimento: 27, limite: null } as Card; // vence no mesmo mês do fechamento
const cardX = { id: 'c2', nome: 'Cartão', dia_fechamento: 28, dia_vencimento: 5, limite: null } as Card;  // vence no mês seguinte ao fechamento

function compra(p: Partial<CardPurchase>): CardPurchase {
  return { id: 'p1', card_id: 'c1', descricao: 'Compra', valor_total: 300, parcelas: 3, data_compra: '2026-07-01', categoria: 'Outros', ...p };
}

describe('firstInvoiceMonth', () => {
  it('compra antes do fechamento, vencimento no mesmo mês', () => {
    expect(firstInvoiceMonth('2026-07-10', 20, 27)).toBe('2026-07');
  });
  it('compra depois do fechamento, vencimento no mesmo mês', () => {
    expect(firstInvoiceMonth('2026-07-25', 20, 27)).toBe('2026-08');
  });
  it('compra antes do fechamento, vencimento no mês seguinte', () => {
    expect(firstInvoiceMonth('2026-07-10', 28, 5)).toBe('2026-08');
  });
  it('compra depois do fechamento, vencimento no mês seguinte', () => {
    expect(firstInvoiceMonth('2026-07-30', 28, 5)).toBe('2026-09');
  });
  it('compra exatamente no dia do fechamento entra na fatura aberta', () => {
    expect(firstInvoiceMonth('2026-07-20', 20, 27)).toBe('2026-07');
  });
});

describe('parcelaValor', () => {
  it('divide igualmente quando exato', () => {
    expect(parcelaValor(300, 3, 1)).toBe(100);
    expect(parcelaValor(300, 3, 3)).toBe(100);
  });
  it('ajusta centavos na última parcela', () => {
    expect(parcelaValor(100, 3, 1)).toBe(33.33);
    expect(parcelaValor(100, 3, 2)).toBe(33.33);
    expect(parcelaValor(100, 3, 3)).toBe(33.34);
  });
  it('a soma das parcelas fecha o total', () => {
    const soma = [1, 2, 3, 4, 5, 6, 7].reduce((s, i) => s + parcelaValor(199.99, 7, i), 0);
    expect(Math.round(soma * 100) / 100).toBe(199.99);
  });
});

describe('faturaDoMes', () => {
  it('projeta as parcelas nos meses corretos', () => {
    const compras = [compra({ data_compra: '2026-07-01', valor_total: 300, parcelas: 3 })];
    expect(faturaDoMes(compras, cardV, '2026-06').total).toBe(0);
    expect(faturaDoMes(compras, cardV, '2026-07').total).toBe(100);
    expect(faturaDoMes(compras, cardV, '2026-09').total).toBe(100);
    expect(faturaDoMes(compras, cardV, '2026-10').total).toBe(0);
  });
  it('cartão que vence no mês seguinte ao fechamento desloca a fatura', () => {
    const compras = [compra({ data_compra: '2026-07-01', valor_total: 300, parcelas: 3 })];
    expect(faturaDoMes(compras, cardX, '2026-07').total).toBe(0);
    expect(faturaDoMes(compras, cardX, '2026-08').total).toBe(100);
  });
  it('soma compras diferentes na mesma fatura, com número da parcela', () => {
    const compras = [
      compra({ id: 'a', data_compra: '2026-07-01', valor_total: 300, parcelas: 3 }),
      compra({ id: 'b', data_compra: '2026-08-05', valor_total: 50, parcelas: 1 }),
    ];
    const f = faturaDoMes(compras, cardV, '2026-08');
    expect(f.total).toBe(150);
    expect(f.items).toHaveLength(2);
    const itemA = f.items.find(i => i.purchaseId === 'a')!;
    expect(itemA.parcela).toBe(2);
    expect(itemA.parcelas).toBe(3);
  });
});

describe('limiteUtilizado', () => {
  it('soma parcelas de faturas não pagas a partir do mês dado', () => {
    const compras = [compra({ data_compra: '2026-07-01', valor_total: 300, parcelas: 3 })]; // faturas 07, 08, 09
    expect(limiteUtilizado(compras, cardV, [], '2026-07')).toBe(300);
    expect(limiteUtilizado(compras, cardV, ['2026-07'], '2026-07')).toBe(200);
    expect(limiteUtilizado(compras, cardV, [], '2026-09')).toBe(100);
  });
});
