import { firstInvoiceMonth, parcelaValor } from './invoice';
import { shiftMonth } from './months';
import { monthTotals } from './totals';
import { Card, Transaction } from './types';

export interface ParcelaGerada {
  month: string;
  dia: number | null;
  valor: number;
  parcela: number;
}

/**
 * Distribui uma compra do cartão pelas faturas. Com o cartão configurado e a data
 * da compra informada, o fechamento decide a primeira fatura; sem isso, a compra
 * entra no mês que o usuário está vendo.
 */
export function gerarParcelas(c: {
  valorTotal: number;
  parcelas: number;
  dataCompra: string | null;
  mesBase: string;
  card: Pick<Card, 'dia_fechamento' | 'dia_vencimento'> | null;
}): ParcelaGerada[] {
  const primeira = c.card && c.dataCompra
    ? firstInvoiceMonth(c.dataCompra, c.card.dia_fechamento, c.card.dia_vencimento)
    : c.mesBase;
  const dia = c.dataCompra ? Number(c.dataCompra.split('-')[2]) : null;
  return Array.from({ length: c.parcelas }, (_, i) => ({
    month: shiftMonth(primeira, i),
    dia,
    valor: parcelaValor(c.valorTotal, c.parcelas, i + 1),
    parcela: i + 1,
  }));
}

/** Quanto do limite está comprometido: itens do cartão não pagos de `desde` em diante. */
export function limiteUsado(txs: Transaction[], desde: string): number {
  const cents = txs
    .filter(t => t.cartao && !t.pago && t.month >= desde)
    .reduce((s, t) => s + Math.round(Number(t.valor) * 100), 0);
  return cents / 100;
}

export interface MesCartao {
  key: string;
  fixos: number;
  variaveis: number;
  total: number;
}

export function evolucaoCartao(meses: string[], txs: Transaction[]): MesCartao[] {
  return meses.map(key => {
    const c = monthTotals(txs.filter(t => t.month === key)).cartao;
    return { key, fixos: c.fixos, variaveis: c.variaveis, total: c.total };
  });
}

/** Variação percentual inteira em relação ao mês anterior; null sem base. */
export function variacaoPercentual(atual: number, anterior: number): number | null {
  if (!anterior) return null;
  return Math.round(((atual - anterior) / anterior) * 100);
}
