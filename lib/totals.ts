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
