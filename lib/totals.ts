import { InvoiceItem, Transaction, TxType } from './types';

export interface MonthTotals {
  entradas: number; fixos: number; variaveis: number;
  fatura: number; saidas: number; saldo: number;
}

export function monthTotals(txs: Transaction[], faturaTotal: number): MonthTotals {
  const sum = (type: TxType) =>
    txs.filter(t => t.type === type).reduce((s, t) => s + Number(t.valor), 0);
  const entradas = sum('entrada');
  const fixos = sum('fixo');
  const variaveis = sum('variavel');
  const saidas = fixos + variaveis + faturaTotal;
  return { entradas, fixos, variaveis, fatura: faturaTotal, saidas, saldo: entradas - saidas };
}

/** Soma dos resultados (entradas − saídas) de todos os meses até `ate`, inclusive. */
export function saldoAcumulado(
  meses: string[],
  txs: Transaction[],
  faturaDoMes: (month: string) => number,
  ate: string,
): number {
  let total = 0;
  for (const m of meses) {
    if (m > ate) continue;
    total += monthTotals(txs.filter(t => t.month === m), faturaDoMes(m)).saldo;
  }
  return Math.round(total * 100) / 100;
}

/** Gastos (fixos + variáveis + parcelas do cartão) somados por categoria. */
export function gastosPorCategoria(txs: Transaction[], invoiceItems: InvoiceItem[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const t of txs) {
    if (t.type === 'entrada') continue;
    const c = t.categoria || 'Outros';
    map[c] = (map[c] || 0) + Number(t.valor);
  }
  for (const i of invoiceItems) {
    map[i.categoria] = (map[i.categoria] || 0) + i.valor;
  }
  return map;
}
