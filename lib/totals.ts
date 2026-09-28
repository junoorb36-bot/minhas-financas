import { Transaction, TxType } from './types';

export interface MonthTotals {
  entradas: number;
  fixos: number;
  variaveis: number;
  saidas: number;
  saldo: number;
  /** a parte das saídas paga no cartão de crédito */
  cartao: { fixos: number; variaveis: number; total: number };
}

const arred = (v: number) => Math.round(v * 100) / 100;

export function monthTotals(txs: Transaction[]): MonthTotals {
  const sum = (type: TxType, soCartao = false) => arred(
    txs.filter(t => t.type === type && (!soCartao || t.cartao)).reduce((s, t) => s + Number(t.valor), 0),
  );
  const entradas = sum('entrada');
  const fixos = sum('fixo');
  const variaveis = sum('variavel');
  const saidas = arred(fixos + variaveis);
  const cFixos = sum('fixo', true);
  const cVariaveis = sum('variavel', true);
  return {
    entradas, fixos, variaveis, saidas, saldo: arred(entradas - saidas),
    cartao: { fixos: cFixos, variaveis: cVariaveis, total: arred(cFixos + cVariaveis) },
  };
}

/** Soma dos resultados (entradas − saídas) de todos os meses até `ate`, inclusive. */
export function saldoAcumulado(meses: string[], txs: Transaction[], ate: string): number {
  let total = 0;
  for (const m of meses) {
    if (m > ate) continue;
    total += monthTotals(txs.filter(t => t.month === m)).saldo;
  }
  return arred(total);
}

/** Gastos (fixos + variáveis, dentro e fora do cartão) somados por categoria. */
export function gastosPorCategoria(txs: Transaction[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const t of txs) {
    if (t.type === 'entrada') continue;
    const c = t.categoria || 'Outros';
    map[c] = arred((map[c] || 0) + Number(t.valor));
  }
  return map;
}
