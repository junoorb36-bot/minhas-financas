import { describe, expect, it } from 'vitest';
import { firstInvoiceMonth, parcelaValor } from '@/lib/invoice';

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
