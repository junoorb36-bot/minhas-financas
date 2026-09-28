export type TxType = 'entrada' | 'fixo' | 'variavel';

export interface Transaction {
  id: string;
  month: string; // 'YYYY-MM' — para itens do cartão, o mês em que a fatura é paga
  type: TxType;
  descricao: string;
  valor: number;
  categoria: string | null; // null para entradas
  dia_vencimento: number | null; // null para entradas; no cartão, o dia da compra
  pago: boolean; // para entradas significa "recebido"
  cartao: boolean; // pago no cartão de crédito
  parcela: number | null; // compras parceladas: número desta parcela (1-based)
  parcelas: number | null; // compras parceladas: total de parcelas
  grupo: string | null; // compras parceladas: id compartilhado por todas as parcelas
}

export interface MonthRow {
  id: string;
  month: string;
  meta: number;
  nota: string | null;
}

export interface Card {
  id: string;
  nome: string;
  dia_fechamento: number; // 1–28
  dia_vencimento: number; // 1–28
  limite: number | null;
}

export interface Budget {
  id: string;
  month: string;
  categoria: string;
  limite: number;
}
