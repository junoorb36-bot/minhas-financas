import { fmtBRL, fmtCompacto } from '@/lib/money';
import { shortMonth } from '@/lib/months';
import { PontoMes } from '@/lib/trend';

interface Linha { tipo: 'media' | 'limite'; valor: number; pos: number }

/**
 * Barras do gasto mês a mês com as linhas de média e de limite. Feito em HTML
 * (e não SVG escalado) para o texto manter o tamanho em qualquer largura; as
 * etiquetas das linhas ficam numa coluna própria para não cobrir as barras.
 */
export default function CategoryTrendChart({ serie, media, limite, selecionado, onSelect }: {
  serie: PontoMes[]; media: number | null; limite: number | null;
  /** mês com a barra destacada (detalhe aberto) */
  selecionado?: string | null;
  onSelect?: (month: string) => void;
}) {
  const max = Math.max(1, ...serie.map(p => p.total), media ?? 0, limite ?? 0) * 1.12;
  const pct = (v: number) => (v / max) * 100;

  const linhas: Linha[] = [];
  if (media !== null && media > 0) linhas.push({ tipo: 'media', valor: media, pos: pct(media) });
  if (limite !== null) linhas.push({ tipo: 'limite', valor: limite, pos: pct(limite) });
  // etiquetas muito próximas: afasta a de baixo para não se sobreporem
  if (linhas.length === 2) {
    const [alta, baixa] = linhas[0].pos >= linhas[1].pos ? [linhas[0], linhas[1]] : [linhas[1], linhas[0]];
    if (alta.pos - baixa.pos < 12) baixa.pos = Math.max(0, alta.pos - 12);
  }

  return (
    <div className="tchart" role="img" aria-label="Gasto da categoria mês a mês">
      <div className="tchart-plot">
        {linhas.map(l => (
          <div key={`linha-${l.tipo}`} className={`tchart-line ${l.tipo}`} style={{ bottom: `${pct(l.valor)}%` }} />
        ))}
        {serie.map((p, i) => {
          const atual = i === serie.length - 1;
          const estourou = limite !== null && p.total > limite;
          return (
            <button
              key={p.month}
              type="button"
              className={`tchart-col ${selecionado === p.month ? 'sel' : ''}`}
              title={`${shortMonth(p.month)}: ${fmtBRL(p.total)} — clique para ver o detalhe`}
              onClick={() => onSelect?.(p.month)}
              disabled={p.total === 0}
              aria-pressed={selecionado === p.month}
            >
              <div className={`tchart-bar ${estourou ? 'acima' : ''} ${atual ? 'atual' : ''}`} style={{ height: `${pct(p.total)}%` }}>
                {p.total > 0 && <span className="tchart-val">{fmtCompacto(p.total)}</span>}
              </div>
            </button>
          );
        })}
      </div>
      <div className="tchart-gutter">
        {linhas.map(l => (
          <span key={`tag-${l.tipo}`} className={`tchart-tag ${l.tipo}`} style={{ bottom: `${l.pos}%` }}>
            {l.tipo === 'media' ? 'média' : 'limite'} {fmtCompacto(l.valor)}
          </span>
        ))}
      </div>
      <div className="tchart-months">
        {serie.map((p, i) => (
          <span key={p.month} className={i === serie.length - 1 ? 'atual' : ''}>{shortMonth(p.month)}</span>
        ))}
      </div>
    </div>
  );
}
