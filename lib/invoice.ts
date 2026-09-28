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
