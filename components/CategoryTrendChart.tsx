import { fmtCompacto } from '@/lib/money';
import { shortMonth } from '@/lib/months';
import { PontoMes } from '@/lib/trend';

/** Barras do gasto mês a mês, com linha tracejada da média e linha do limite do orçamento. */
export default function CategoryTrendChart({ serie, media, limite }: { serie: PontoMes[]; media: number | null; limite: number | null }) {
  const W = 640, H = 240, padL = 10, padR = 10, padT = 26, padB = 28;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const max = Math.max(1, ...serie.map(p => p.total), media ?? 0, limite ?? 0) * 1.08;
  const base = padT + innerH;
  const y = (v: number) => base - (v / max) * innerH;
  const slot = innerW / serie.length;
  const barW = Math.min(56, slot * 0.55);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Gasto da categoria mês a mês">
      <line x1={padL} y1={base} x2={W - padR} y2={base} stroke="var(--border)" />
      {serie.map((p, i) => {
        const cx = padL + slot * i + slot / 2;
        const atual = i === serie.length - 1;
        const acimaLimite = limite !== null && p.total > limite;
        const cor = acimaLimite ? 'var(--red)' : 'var(--green)';
        return (
          <g key={p.month}>
            <rect x={cx - barW / 2} y={y(p.total)} width={barW} height={Math.max(base - y(p.total), p.total > 0 ? 2 : 0)} rx={6}
              fill={cor} opacity={atual ? 1 : 0.45} />
            {p.total > 0 && (
              <text x={cx} y={y(p.total) - 7} textAnchor="middle" fontSize={12} fontWeight={atual ? 700 : 500} fill="var(--text)">
                {fmtCompacto(p.total)}
              </text>
            )}
            <text x={cx} y={H - 9} textAnchor="middle" fontSize={12} fontWeight={atual ? 700 : 400} fill="var(--text-subtle)">
              {shortMonth(p.month)}
            </text>
          </g>
        );
      })}
      {media !== null && media > 0 && (
        <g>
          <line x1={padL} y1={y(media)} x2={W - padR} y2={y(media)} stroke="var(--ink)" strokeDasharray="6 5" strokeWidth={1.5} opacity={0.7} />
          <text x={W - padR} y={y(media) - 5} textAnchor="end" fontSize={11} fill="var(--text-muted)">média {fmtCompacto(media)}</text>
        </g>
      )}
      {limite !== null && (
        <g>
          <line x1={padL} y1={y(limite)} x2={W - padR} y2={y(limite)} stroke="var(--amber)" strokeWidth={2} />
          <text x={padL} y={y(limite) - 5} fontSize={11} fontWeight={600} fill="var(--amber)">limite {fmtCompacto(limite)}</text>
        </g>
      )}
    </svg>
  );
}
