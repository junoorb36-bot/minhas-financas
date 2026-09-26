import { describe, expect, it } from 'vitest';
import { saidasPorDia } from '@/lib/daily';
import { fmtCompacto } from '@/lib/money';
import { diasNoMes } from '@/lib/months';
import { saldoAcumulado } from '@/lib/totals';
import { Transaction } from '@/lib/types';

function tx(p: Partial<Transaction>): Transaction {
  return { id: 'x', month: '2026-09', type: 'variavel', descricao: 'T', valor: 100, categoria: 'Outros', dia_vencimento: 1, pago: false, ...p };
}

describe('diasNoMes', () => {
  it('conta os dias de cada mês', () => {
    expect(diasNoMes('2026-09')).toBe(30);
    expect(diasNoMes('2026-12')).toBe(31);
    expect(diasNoMes('2026-02')).toBe(28);
    expect(diasNoMes('2028-02')).toBe(29);
  });
});

describe('fmtCompacto', () => {
  it('valores abaixo de mil ficam inteiros', () => {
    expect(fmtCompacto(590)).toBe('R$ 590');
    expect(fmtCompacto(155.4)).toBe('R$ 155');
  });
  it('milhares com uma casa decimal', () => {
    expect(fmtCompacto(32200)).toBe('R$ 32,2mil');
    expect(fmtCompacto(636700)).toBe('R$ 636,7mil');
    expect(fmtCompacto(4000)).toBe('R$ 4,0mil');
    expect(fmtCompacto(999.96)).toBe('R$ 1,0mil');
  });
  it('milhões', () => {
    expect(fmtCompacto(1_500_000)).toBe('R$ 1,5mi');
  });
});

describe('saidasPorDia', () => {
  it('agrupa as saídas por dia e ignora entradas', () => {
    const r = saidasPorDia([
      tx({ dia_vencimento: 5, valor: 100 }),
      tx({ dia_vencimento: 5, valor: 50, type: 'fixo' }),
      tx({ dia_vencimento: 10, valor: 30 }),
      tx({ type: 'entrada', valor: 5000, dia_vencimento: null, categoria: null }),
    ], '2026-09');
    expect(r.dias).toHaveLength(30);
    expect(r.dias[4].total).toBe(150);
    expect(r.dias[4].itens.map(i => i.tipo)).toEqual(['Variável', 'Fixo']);
    expect(r.dias[9].total).toBe(30);
    expect(r.total).toBe(180);
    expect(r.diasComSaida).toBe(2);
    expect(r.maiorDia!.dia).toBe(5);
    expect(r.mediaPorDia).toBe(6); // 180 / 30 dias
  });
  it('lançamentos sem dia entram no total, mas não no calendário', () => {
    const r = saidasPorDia([tx({ dia_vencimento: null, valor: 40 }), tx({ dia_vencimento: 2, valor: 10 })], '2026-09');
    expect(r.semData.total).toBe(40);
    expect(r.total).toBe(50);
    expect(r.diasComSaida).toBe(1);
  });
  it('dia 31 em mês de 30 dias cai no último dia', () => {
    const r = saidasPorDia([tx({ dia_vencimento: 31, valor: 20 })], '2026-09');
    expect(r.dias[29].total).toBe(20);
  });
  it('fatura do cartão entra no dia de vencimento do cartão', () => {
    const r = saidasPorDia([], '2026-09', { nome: 'Nubank', total: 300, dia: 27 });
    expect(r.dias[26].itens).toEqual([{ descricao: 'Fatura Nubank', valor: 300, tipo: 'Cartão' }]);
    expect(r.total).toBe(300);
  });
  it('mês sem saídas', () => {
    const r = saidasPorDia([], '2026-09');
    expect(r.total).toBe(0);
    expect(r.maiorDia).toBeNull();
    expect(r.diasComSaida).toBe(0);
  });
});

describe('saldoAcumulado', () => {
  it('soma o resultado de todos os meses até o mês informado', () => {
    const txs = [
      tx({ month: '2026-07', type: 'entrada', valor: 1000 }),
      tx({ month: '2026-07', valor: 400 }),
      tx({ month: '2026-08', type: 'entrada', valor: 1000 }),
      tx({ month: '2026-08', valor: 900 }),
      tx({ month: '2026-09', type: 'entrada', valor: 1000 }),
    ];
    const fatura = (m: string) => (m === '2026-08' ? 50 : 0);
    // jul: +600, ago: +50, set: +1000
    expect(saldoAcumulado(['2026-07', '2026-08', '2026-09'], txs, fatura, '2026-08')).toBe(650);
    expect(saldoAcumulado(['2026-07', '2026-08', '2026-09'], txs, fatura, '2026-09')).toBe(1650);
  });
});
