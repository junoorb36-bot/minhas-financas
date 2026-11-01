import { gastosPorCategoria } from './totals';
import { Transaction } from './types';

export interface PontoMes {
  month: string;
  total: number;
}

export type Tendencia = 'abaixo' | 'acima' | 'na-media' | 'sem-historico';

export interface EvolucaoCategoria {
  categoria: string;
  serie: PontoMes[]; // um ponto por mês, em ordem, terminando no mês de referência
  atual: number;
  anterior: number | null; // mês imediatamente anterior, se existir na série
  media: number | null; // média dos meses anteriores ao de referência
  tendencia: Tendencia;
}

// diferenças pequenas contam como "na média", para não oscilar à toa
const MIN_REAIS = 20;
const MIN_PCT = 10;

export function classificarTendencia(atual: number, media: number | null): Tendencia {
  if (media === null) return 'sem-historico';
  const dif = atual - media;
  if (Math.abs(dif) < MIN_REAIS) return 'na-media';
  if (media > 0 && Math.abs(dif / media) * 100 < MIN_PCT) return 'na-media';
  return dif < 0 ? 'abaixo' : 'acima';
}

/**
 * Gasto de cada categoria mês a mês. `meses` em ordem crescente; o último é o mês
 * de referência. Categorias sem nenhum gasto no período ficam de fora.
 */
export function evolucaoPorCategoria(txs: Transaction[], meses: string[]): EvolucaoCategoria[] {
  const porMes = meses.map(m => gastosPorCategoria(txs.filter(t => t.month === m)));
  const categorias = new Set(porMes.flatMap(g => Object.keys(g)));
  const arred = (v: number) => Math.round(v * 100) / 100;

  return [...categorias].map(categoria => {
    const serie = meses.map((month, i) => ({ month, total: porMes[i][categoria] ?? 0 }));
    const atual = serie[serie.length - 1].total;
    const passados = serie.slice(0, -1);
    const media = passados.length ? arred(passados.reduce((s, p) => s + p.total, 0) / passados.length) : null;
    return {
      categoria,
      serie,
      atual,
      anterior: passados.length ? passados[passados.length - 1].total : null,
      media,
      tendencia: classificarTendencia(atual, media),
    };
  }).sort((a, b) => b.atual - a.atual);
}
