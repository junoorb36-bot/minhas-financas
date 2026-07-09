import { Card, CardPurchase, InvoiceItem } from './types';
import { shiftMonth } from './months';

/** Mês (YYYY-MM) da fatura que recebe a 1ª parcela de uma compra. */
export function firstInvoiceMonth(dataCompra: string, diaFechamento: number, diaVencimento: number): string {
  const [y, m, d] = dataCompra.split('-').map(Number);
  let key = y + '-' + String(m).padStart(2, '0');
  if (d > diaFechamento) key = shiftMonth(key, 1); // já fechou: vai para o ciclo seguinte
  if (diaVencimento <= diaFechamento) key = shiftMonth(key, 1); // vencimento cai no mês após o fechamento
  return key;
}

/** Valor da parcela `indice` (1-based); centavos restantes vão para a última. */
export function parcelaValor(valorTotal: number, parcelas: number, indice: number): number {
  const cents = Math.round(valorTotal * 100);
  const base = Math.floor(cents / parcelas);
  const resto = cents - base * parcelas;
  return (indice === parcelas ? base + resto : base) / 100;
}

/** Itens e total da fatura de um mês, derivados das compras. */
export function faturaDoMes(purchases: CardPurchase[], card: Card, month: string): { items: InvoiceItem[]; total: number } {
  const items: InvoiceItem[] = [];
  for (const p of purchases) {
    const first = firstInvoiceMonth(p.data_compra, card.dia_fechamento, card.dia_vencimento);
    for (let i = 1; i <= p.parcelas; i++) {
      if (shiftMonth(first, i - 1) === month) {
        items.push({
          purchaseId: p.id, descricao: p.descricao, categoria: p.categoria,
          parcela: i, parcelas: p.parcelas, valor: parcelaValor(Number(p.valor_total), p.parcelas, i),
        });
      }
    }
  }
  const total = items.reduce((s, i) => s + i.valor, 0);
  return { items, total: Math.round(total * 100) / 100 };
}

/** Soma das parcelas em faturas ainda não pagas, do mês `fromMonth` em diante. */
export function limiteUtilizado(purchases: CardPurchase[], card: Card, paidMonths: string[], fromMonth: string): number {
  let cents = 0;
  for (const p of purchases) {
    const first = firstInvoiceMonth(p.data_compra, card.dia_fechamento, card.dia_vencimento);
    for (let i = 1; i <= p.parcelas; i++) {
      const m = shiftMonth(first, i - 1);
      if (m >= fromMonth && !paidMonths.includes(m)) {
        cents += Math.round(parcelaValor(Number(p.valor_total), p.parcelas, i) * 100);
      }
    }
  }
  return cents / 100;
}
