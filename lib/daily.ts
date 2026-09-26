import { diasNoMes } from './months';
import { Transaction } from './types';

export interface ItemDia {
  descricao: string;
  valor: number;
  tipo: 'Fixo' | 'Variável' | 'Cartão';
}

export interface DiaSaida {
  dia: number; // 0 = lançamentos sem dia definido
  total: number;
  itens: ItemDia[];
}

export interface ResumoDiario {
  dias: DiaSaida[]; // um por dia do mês, índice 0 = dia 1
  semData: DiaSaida;
  total: number;
  diasComSaida: number;
  maiorDia: DiaSaida | null;
  mediaPorDia: number; // total ÷ dias do mês
}

/**
 * Distribui as saídas do mês pelos dias de vencimento. A fatura do cartão entra
 * como um item único no dia de vencimento do cartão, para o total bater com as
 * saídas do mês.
 */
export function saidasPorDia(
  txs: Transaction[],
  month: string,
  fatura?: { nome: string; total: number; dia: number } | null,
): ResumoDiario {
  const n = diasNoMes(month);
  const dias: DiaSaida[] = Array.from({ length: n }, (_, i) => ({ dia: i + 1, total: 0, itens: [] }));
  const semData: DiaSaida = { dia: 0, total: 0, itens: [] };

  const add = (dia: number | null, item: ItemDia) => {
    const alvo = dia ? dias[Math.min(dia, n) - 1] : semData;
    alvo.itens.push(item);
    alvo.total += item.valor;
  };

  for (const t of txs) {
    if (t.type === 'entrada') continue;
    add(t.dia_vencimento, { descricao: t.descricao, valor: Number(t.valor), tipo: t.type === 'fixo' ? 'Fixo' : 'Variável' });
  }
  if (fatura && fatura.total > 0) {
    add(fatura.dia, { descricao: `Fatura ${fatura.nome}`, valor: fatura.total, tipo: 'Cartão' });
  }

  for (const d of [...dias, semData]) d.total = Math.round(d.total * 100) / 100;
  const total = Math.round((dias.reduce((s, d) => s + d.total, 0) + semData.total) * 100) / 100;
  const comSaida = dias.filter(d => d.total > 0);
  const maiorDia = comSaida.reduce<DiaSaida | null>((m, d) => (!m || d.total > m.total ? d : m), null);

  return { dias, semData, total, diasComSaida: comSaida.length, maiorDia, mediaPorDia: total / n };
}
