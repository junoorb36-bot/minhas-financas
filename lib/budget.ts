import { Budget } from './types';

export type StatusOrcamento = 'ok' | 'alerta' | 'estourou';

export interface ItemOrcamento {
  categoria: string;
  gasto: number;
  limite: number;
  pct: number; // gasto ÷ limite, em % inteiro (pode passar de 100)
  status: StatusOrcamento;
}

/** Verde até 80% do limite, âmbar de 80% até o limite, vermelho acima dele. */
export function statusOrcamento(gasto: number, limite: number): StatusOrcamento {
  if (gasto > limite) return 'estourou';
  if (gasto >= limite * 0.8) return 'alerta';
  return 'ok';
}

/** Situação de cada categoria que tem limite no mês, as mais críticas primeiro. */
export function situacaoOrcamento(budgets: Budget[], gastos: Record<string, number>): ItemOrcamento[] {
  return budgets
    .filter(b => Number(b.limite) > 0)
    .map(b => {
      const limite = Number(b.limite);
      const gasto = gastos[b.categoria] ?? 0;
      return { categoria: b.categoria, gasto, limite, pct: Math.round((gasto / limite) * 100), status: statusOrcamento(gasto, limite) };
    })
    .sort((a, b) => b.pct - a.pct);
}
